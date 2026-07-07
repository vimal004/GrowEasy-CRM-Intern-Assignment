import fs from 'fs';
import path from 'path';
import { ImportResult, LeadCrm } from '@groweasy/shared';
import { LLMProvider } from './providers/provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MockProvider } from './providers/mock.provider';
import { processInBatches } from './batch.service';
import { withRetry } from './retry.service';
import { validateAndRepair } from './validation.service';
import { mapToCrmLead, RawExtractedLead } from '../crm/mapper';
import { mapRowHeaders, DeterministicLead } from '../csv/headerMapper';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { AIError } from '../../utils/errors';

/**
 * Loads a prompt markdown file from disk, checking several potential paths
 * depending on the execution context (running typescript files vs compiled dist files).
 */
export function loadPromptFile(filename: string): string {
  const possiblePaths = [
    path.resolve(__dirname, '../../prompts', filename), // tsx watch execution
    path.resolve(__dirname, '../../../src/prompts', filename), // compiled dist execution
    path.resolve(process.cwd(), 'src/prompts', filename), // relative to workspace root (when running in apps/api)
    path.resolve(process.cwd(), 'apps/api/src/prompts', filename), // relative to root workspace
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }

  logger.error(`[AIService] Failed to load prompt file ${filename}. Paths checked:`, possiblePaths);
  throw new AIError(`Prompt file ${filename} not found.`);
}

/**
 * Returns the configured LLM provider instance.
 */
export function getLlmProvider(): LLMProvider {
  switch (config.llmProvider) {
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'groq':
      return new GroqProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

/**
 * Returns a fallback LLM provider when the primary one fails.
 * Falls back to Gemini → OpenAI → Mock.
 */
function getFallbackProvider(primary: LLMProvider): LLMProvider | null {
  if (primary.name === 'openai') return new GeminiProvider();
  if (primary.name === 'gemini') return new OpenAIProvider();
  return null;
}

// In-memory cache for LLM results to optimize processing speed and reduce API costs.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const llmCache = new Map<string, { value: RawExtractedLead; expiresAt: number }>();

function getRecordCacheKey(record: DeterministicLead): string {
  return JSON.stringify({
    name: record.name,
    company: record.company,
    city: record.city,
    state: record.state,
    country: record.country,
    possession_time: record.possession_time,
    description: record.description,
    crm_note: record.crm_note,
    unmapped_data: record.unmapped_data,
  });
}

/**
 * Converts a DeterministicLead (post-headerMapper) directly to a RawExtractedLead
 * without invoking the LLM. Used when contacts are already reliably identified.
 */
function deterministicToRaw(lead: DeterministicLead): RawExtractedLead {
  return {
    created_at: lead.created_at,
    name: lead.name,
    emails: lead.emails,
    mobiles: lead.mobiles,
    company: lead.company,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    country_code: lead.country_code,
    lead_owner: lead.lead_owner,
    crm_status: lead.crm_status,
    data_source: lead.data_source,
    possession_time: lead.possession_time,
    description: lead.description,
    crm_note: lead.crm_note,
    unmapped_data: lead.unmapped_data,
  };
}

/**
 * Runs the complete AI Lead Import pipeline on an array of raw CSV rows.
 * 
 * @param rawRecords The raw CSV rows parsed from the input file.
 * @returns A promise resolving to the final ImportResult structure.
 */
export async function runImportPipeline(
  rawRecords: Record<string, string>[]
): Promise<ImportResult> {
  const startTime = Date.now();
  const provider = getLlmProvider();
  
  logger.info(`[AIService] Starting AI import pipeline with provider: ${provider.name} for ${rawRecords.length} records.`);

  if (rawRecords.length === 0) {
    return {
      importedRecords: [],
      skippedRecords: [],
      metrics: {
        importedCount: 0,
        skippedCount: 0,
        successRate: 0,
        processingTimeMs: 0,
      },
    };
  }

  // Load prompts
  const systemPrompt = loadPromptFile('system.md') + '\n\n' + loadPromptFile('examples.md');
  const extractionPrompt = loadPromptFile('extraction.md');
  const repairPrompt = loadPromptFile('repair.md');

  const importedRecords: LeadCrm[] = [];
  const skippedRecords: ImportResult['skippedRecords'] = [];

  const preMappedRecords = rawRecords.map(mapRowHeaders);

  // ─── Fast path / LLM path split ────────────────────────────────────────────
  // Records where deterministic mapping already found contacts bypass the LLM.
  // Records with no contacts need LLM to extract them from notes/description/unmapped.
  const fastPathLeads: { originalIndex: number; lead: RawExtractedLead }[] = [];
  const llmRecords: { originalIndex: number; record: DeterministicLead }[] = [];

  preMappedRecords.forEach((record, index) => {
    const hasEmail = record.emails.length > 0;
    const hasMobile = record.mobiles.length > 0;

    if (hasEmail || hasMobile) {
      // Already mapped — convert deterministically, no LLM needed
      fastPathLeads.push({ originalIndex: index, lead: deterministicToRaw(record) });
    } else {
      // No contacts found yet — send to LLM to extract from notes/description
      llmRecords.push({ originalIndex: index, record });
    }
  });

  logger.info(`[AIService] Fast-path (deterministic): ${fastPathLeads.length} records. LLM path: ${llmRecords.length} records.`);

  // ─── LLM path ──────────────────────────────────────────────────────────────
  const llmExtracted: { originalIndex: number; lead: RawExtractedLead }[] = [];

  if (llmRecords.length > 0) {
    const cacheMissEntries: typeof llmRecords = [];

    // Check cache first
    llmRecords.forEach((entry) => {
      const key = getRecordCacheKey(entry.record);
      const cached = llmCache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        logger.debug(`[AIService] Cache hit for row ${entry.originalIndex + 1}. Skipping LLM call.`);
        llmExtracted.push({ originalIndex: entry.originalIndex, lead: cached.value });
      } else {
        if (cached) {
          llmCache.delete(key); // Evict expired entry
        }
        cacheMissEntries.push(entry);
      }
    });

    if (cacheMissEntries.length > 0) {
      const batchSize = config.batchSize;
      const llmBatchInput = cacheMissEntries.map(r => r.record);

      let llmResults: RawExtractedLead[] = [];
      try {
        llmResults = await processInBatches(
          llmBatchInput,
          batchSize,
          async (batch, batchIndex, totalBatches) => {
            const rawResponse = await withRetry(() =>
              provider.extractLeads(batch, systemPrompt, extractionPrompt)
            );
            return validateAndRepair(rawResponse, provider, repairPrompt, systemPrompt);
          }
        );
      } catch (err: any) {
        // Try fallback provider before giving up
        const fallback = getFallbackProvider(provider);
        if (fallback) {
          logger.warn(`[AIService] Primary provider (${provider.name}) failed. Trying fallback: ${fallback.name}`);
          try {
            llmResults = await processInBatches(
              llmBatchInput,
              batchSize,
              async (batch) => {
                const rawResponse = await withRetry(() =>
                  fallback.extractLeads(batch, systemPrompt, extractionPrompt)
                );
                return validateAndRepair(rawResponse, fallback, repairPrompt, systemPrompt);
              }
            );
          } catch (fallbackErr: any) {
            logger.error(`[AIService] Fallback provider (${fallback.name}) also failed:`, fallbackErr.message);
            throw err; // Re-throw original error
          }
        } else {
          throw err;
        }
      }

      // Populate cache and align LLM output to original indices
      cacheMissEntries.forEach((entry, batchIdx) => {
        const extractedLead = llmResults[batchIdx];
        if (extractedLead) {
          const key = getRecordCacheKey(entry.record);
          // Cap cache size at 1000 entries to prevent memory leaks in production
          if (llmCache.size >= 1000) {
            const oldestKey = llmCache.keys().next().value;
            if (oldestKey) {
              llmCache.delete(oldestKey);
            }
          }
          llmCache.set(key, {
            value: extractedLead,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          llmExtracted.push({ originalIndex: entry.originalIndex, lead: extractedLead });
        } else {
          logger.warn(`[AIService] LLM returned no result for batch index ${batchIdx} (original row ${entry.originalIndex + 1}). Skipping.`);
          skippedRecords.push({
            rowIndex: entry.originalIndex + 1,
            reason: `Skipped row ${entry.originalIndex + 1}: contains neither a valid email nor mobile number.`,
            rawRecord: rawRecords[entry.originalIndex] || {},
          });
        }
      });
    }
  }

  // ─── Merge and sort by original index ──────────────────────────────────────
  const allExtracted = [...fastPathLeads, ...llmExtracted].sort(
    (a, b) => a.originalIndex - b.originalIndex
  );

  logger.info(`[AIService] Mapping ${allExtracted.length} leads to CRM schema.`);

  allExtracted.forEach(({ originalIndex, lead }) => {
    const originalRecord = rawRecords[originalIndex] || {};
    const rowIndex = originalIndex + 1;

    const { lead: crmLead, reason } = mapToCrmLead(lead, rowIndex);
    if (crmLead) {
      importedRecords.push(crmLead);
    } else {
      skippedRecords.push({
        rowIndex,
        reason: reason || 'Lead mapping validation failed.',
        rawRecord: originalRecord,
      });
    }
  });

  const processingTimeMs = Date.now() - startTime;
  const totalRows = rawRecords.length;
  const successRate = totalRows > 0 ? Math.round((importedRecords.length / totalRows) * 100) : 0;

  logger.info(`[AIService] Pipeline completed. Imported: ${importedRecords.length}, Skipped: ${skippedRecords.length}. Processing Time: ${processingTimeMs}ms`);

  return {
    importedRecords,
    skippedRecords,
    metrics: {
      importedCount: importedRecords.length,
      skippedCount: skippedRecords.length,
      successRate,
      processingTimeMs,
    },
  };
}

