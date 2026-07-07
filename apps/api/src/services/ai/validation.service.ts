import { z } from 'zod';
import { RawExtractedLead } from '../crm/mapper';
import { LLMProvider } from './providers/provider.interface';
import { AIError } from '../../utils/errors';
import { logger } from '../../config/logger';

// Zod schema for validating the raw LLM output before final mapping
export const RawExtractedLeadSchema = z.object({
  created_at: z.coerce.string().catch('').default(''),
  name: z.coerce.string().catch('').default(''),
  emails: z.array(z.coerce.string()).catch([]).default([]),
  mobiles: z.array(z.coerce.string()).catch([]).default([]),
  company: z.coerce.string().catch('').default(''),
  city: z.coerce.string().catch('').default(''),
  state: z.coerce.string().catch('').default(''),
  country: z.coerce.string().catch('').default(''),
  country_code: z.coerce.string().catch('').default(''),
  lead_owner: z.coerce.string().catch('').default(''),
  crm_status: z.coerce.string().catch('').default(''),
  data_source: z.coerce.string().catch('').default(''),
  possession_time: z.coerce.string().catch('').default(''),
  description: z.coerce.string().catch('').default(''),
  crm_note: z.coerce.string().catch('').default(''),
  unmapped_data: z.record(z.any()).catch({}).default({}),
}).passthrough();

// Use .catch([]) so any completely malformed LLM output returns [] instead of crashing
export const RawExtractedLeadsSchema = z.array(RawExtractedLeadSchema).catch([]);

/**
 * Validates a raw JSON string output from the LLM, attempts to parse it,
 * checks it against the schema, and calls the repair mechanism if needed.
 * 
 * @param rawOutput The raw string output from the LLM.
 * @param provider The active LLM provider instance for potential repair calls.
 * @param repairPromptTemplate The markdown template for the repair instruction.
 * @param systemPrompt The system prompt instructions.
 * @param attempt Current repair attempt counter.
 * @returns A promise resolving to an array of validated RawExtractedLead records.
 */
export async function validateAndRepair(
  rawOutput: string,
  provider: LLMProvider,
  repairPromptTemplate: string,
  systemPrompt: string,
  attempt: number = 1
): Promise<RawExtractedLead[]> {
  let cleaned = rawOutput.trim();

  let parsed: any;
  try {
    // 1. Clean code fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
    }

    // 2. Resilient JSON extraction and parsing
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      // Attempt to extract JSON array
      const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        // Attempt to extract single JSON object
        const objectMatch = cleaned.match(/\{\s*"[\s\S]*\}\s*/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw err;
        }
      }
    }

    // 3. Auto-detect and unwrap array wrapped inside an object
    if (parsed && !Array.isArray(parsed)) {
      const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (arrayKey) {
        parsed = parsed[arrayKey];
      } else if (parsed.name || parsed.email || parsed.emails || parsed.mobiles || parsed.mobile_without_country_code) {
        // Single lead object returned instead of an array
        parsed = [parsed];
      }
    }

    // 4. Robust unwrapping of nested arrays and filtering out non-object elements
    if (Array.isArray(parsed)) {
      parsed = parsed
        .filter(item => item !== null && typeof item === 'object')
        .map(item => {
          if (Array.isArray(item)) {
            item = item[0] || {};
          }

          // 5. Force strict type-coercion to guarantee Zod schema validation success
          // Ensure emails is string[]
          if (item.emails !== undefined && item.emails !== null) {
            if (typeof item.emails === 'string') {
              item.emails = [item.emails];
            } else if (!Array.isArray(item.emails)) {
              item.emails = [];
            }
          } else {
            item.emails = [];
          }

          // Ensure mobiles is string[]
          if (item.mobiles !== undefined && item.mobiles !== null) {
            if (typeof item.mobiles === 'string') {
              item.mobiles = [item.mobiles];
            } else if (!Array.isArray(item.mobiles)) {
              item.mobiles = [];
            }
          } else {
            item.mobiles = [];
          }

          // Ensure unmapped_data is Record<string, any>
          if (item.unmapped_data !== undefined && item.unmapped_data !== null) {
            if (typeof item.unmapped_data !== 'object' || Array.isArray(item.unmapped_data)) {
              item.unmapped_data = {};
            }
          } else {
            item.unmapped_data = {};
          }

          // Force basic text fields to string
          const textFields = [
            'created_at', 'name', 'company', 'city', 'state', 'country',
            'country_code', 'lead_owner', 'crm_status', 'data_source',
            'possession_time', 'description', 'crm_note'
          ];
          textFields.forEach(field => {
            if (item[field] !== undefined && item[field] !== null) {
              item[field] = String(item[field]);
            } else {
              item[field] = '';
            }
          });

          return item;
        });
    }
  } catch (err: any) {
    logger.warn(`[ValidationService] JSON Parse failed on attempt ${attempt}: ${err.message}`);
    
    if (attempt >= 2) {
      throw new AIError(`Repaired output is still invalid JSON: ${err.message}. Raw output: ${cleaned}`);
    }

    return handleRepair(
      cleaned,
      `JSON Parse Error: ${err.message}`,
      provider,
      repairPromptTemplate,
      systemPrompt,
      attempt
    );
  }

  // Schema validation
  const validation = RawExtractedLeadsSchema.safeParse(parsed);
  if (!validation.success) {
    const errorDetails = JSON.stringify(validation.error.format());
    logger.warn(`[ValidationService] Schema validation failed on attempt ${attempt}: ${errorDetails}`);

    if (attempt >= 2) {
      throw new AIError(`Repaired output failed schema validation: ${errorDetails}. Raw output: ${cleaned}`);
    }

    return handleRepair(
      cleaned,
      `Schema Validation Errors: ${errorDetails}`,
      provider,
      repairPromptTemplate,
      systemPrompt,
      attempt
    );
  }

  // Convert Zod types safely to RawExtractedLead[]
  return validation.data as RawExtractedLead[];
}

/**
 * Triggers LLM provider self-repair by supplying the error and the malformed output.
 */
async function handleRepair(
  originalOutput: string,
  errors: string,
  provider: LLMProvider,
  repairPromptTemplate: string,
  systemPrompt: string,
  attempt: number
): Promise<RawExtractedLead[]> {
  logger.info(`[ValidationService] Attempting LLM self-repair (Attempt ${attempt})...`);

  // If we are on the mock provider, we shouldn't fail or recurse infinitely
  if (provider.name === 'mock') {
    logger.warn('[ValidationService] Mock provider failed parsing/validation. Direct crash.');
    throw new AIError('Mock provider output was structurally invalid.');
  }

  const userPrompt = repairPromptTemplate
    .replace('{{errors}}', errors)
    .replace('{{originalOutput}}', originalOutput);

  // Invoke the model to repair itself
  const repairedOutput = await provider.extractLeads([], systemPrompt, userPrompt);

  // Recursively validate repaired output
  return validateAndRepair(
    repairedOutput,
    provider,
    repairPromptTemplate,
    systemPrompt,
    attempt + 1
  );
}
