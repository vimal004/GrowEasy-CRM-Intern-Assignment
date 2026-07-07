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
import { mapToCrmLead } from '../crm/mapper';
import { mapRowHeaders } from '../csv/headerMapper';
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

  const preMappedRecords = rawRecords.map(mapRowHeaders);

  // Process in configurable batches
  const batchSize = config.batchSize;
  const rawExtractedLeads = await processInBatches(
    preMappedRecords,
    batchSize,
    async (batch, batchIndex, totalBatches) => {
      // Execute the LLM call with exponential backoff retry
      const rawResponse = await withRetry(() =>
        provider.extractLeads(batch, systemPrompt, extractionPrompt)
      );

      // Validate the JSON structure and repair if required
      const validatedBatch = await validateAndRepair(
        rawResponse,
        provider,
        repairPrompt,
        systemPrompt
      );

      return validatedBatch;
    }
  );

  // Map raw extracted leads to CRM format, applying validation and skipping rules
  const importedRecords: LeadCrm[] = [];
  const skippedRecords: ImportResult['skippedRecords'] = [];

  logger.info(`[AIService] Mapping ${rawExtractedLeads.length} AI-extracted leads to CRM schemas.`);

  rawExtractedLeads.forEach((rawLead, index) => {
    // Correlate with original raw CSV record by index
    const originalRecord = rawRecords[index] || {};
    const rowIndex = index + 1;

    const { lead, reason } = mapToCrmLead(rawLead, rowIndex);
    if (lead) {
      importedRecords.push(lead);
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
