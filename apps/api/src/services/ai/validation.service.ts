import { z } from 'zod';
import { RawExtractedLead } from '../crm/mapper';
import { LLMProvider } from './providers/provider.interface';
import { AIError } from '../../utils/errors';
import { logger } from '../../config/logger';

// Zod schema for validating the raw LLM output before final mapping
export const RawExtractedLeadSchema = z.object({
  created_at: z.string().optional().default(''),
  name: z.string().optional().default(''),
  emails: z.array(z.string()).catch([]).default([]),
  mobiles: z.array(z.string()).catch([]).default([]),
  company: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  country: z.string().optional().default(''),
  country_code: z.string().optional().default(''),
  lead_owner: z.string().optional().default(''),
  crm_status: z.string().optional().default(''),
  data_source: z.string().optional().default(''),
  possession_time: z.string().optional().default(''),
  description: z.string().optional().default(''),
  crm_note: z.string().optional().default(''),
  unmapped_data: z.record(z.any()).catch({}).default({}),
});

export const RawExtractedLeadsSchema = z.array(RawExtractedLeadSchema);

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

  // Strip code fences if the model output them despite instructions
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }

  let parsed: any;
  try {
    // If output has multiple outer brackets or is wrapped in key like { "leads": [...] }
    parsed = JSON.parse(cleaned);
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.leads)) {
      parsed = parsed.leads;
    } else if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.data)) {
      parsed = parsed.data;
    }
  } catch (err: any) {
    logger.warn(`[ValidationService] JSON Parse failed on attempt ${attempt}: ${err.message}`);
    
    if (attempt >= 2) {
      throw new AIError(`Repaired output is still invalid JSON: ${err.message}`);
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
      throw new AIError(`Repaired output failed schema validation: ${errorDetails}`);
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
