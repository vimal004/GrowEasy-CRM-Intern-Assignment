import OpenAI from 'openai';
import { LLMProvider } from './provider.interface';
import { config } from '../../../config/env';
import { AIError } from '../../../utils/errors';
import { logger } from '../../../config/logger';

export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey && config.openaiApiKey !== 'your_openai_api_key_here') {
      this.client = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  public async extractLeads(
    records: any[],
    systemPrompt: string,
    extractionPromptTemplate: string
  ): Promise<string> {
    if (!this.client) {
      throw new AIError('OpenAI API Key is missing or invalid. Check your configuration.', 401);
    }

    const userPrompt = extractionPromptTemplate.replace('{{records}}', JSON.stringify(records, null, 2));

    try {
      logger.debug('[OpenAIProvider] Sending completion request...');
      const start = Date.now();

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Production-grade cost-effective model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // Enforce JSON output format
        response_format: { type: 'json_object' },
        temperature: 0.1, // Highly deterministic
      });

      const latency = Date.now() - start;
      logger.info(`[OpenAIProvider] Request complete. Latency: ${latency}ms`);

      return response.choices[0].message.content || '';
    } catch (err: any) {
      logger.error('OpenAI Provider error:', err);
      const statusCode = err.status || 502;
      throw new AIError(`OpenAI API call failed: ${err.message}`, statusCode);
    }
  }
}
