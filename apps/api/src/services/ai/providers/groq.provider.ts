import Groq from 'groq-sdk';
import { LLMProvider } from './provider.interface';
import { config } from '../../../config/env';
import { AIError } from '../../../utils/errors';
import { logger } from '../../../config/logger';

export class GroqProvider implements LLMProvider {
  public readonly name = 'groq';
  private client: Groq | null = null;

  constructor() {
    if (config.groqApiKey && config.groqApiKey !== 'your_groq_api_key_here') {
      this.client = new Groq({ apiKey: config.groqApiKey });
    }
  }

  public async extractLeads(
    records: any[],
    systemPrompt: string,
    extractionPromptTemplate: string
  ): Promise<string> {
    if (!this.client) {
      throw new AIError('Groq API Key is missing or invalid. Check your configuration.', 401);
    }

    const userPrompt = extractionPromptTemplate.replace('{{records}}', JSON.stringify(records, null, 2));

    try {
      logger.debug('[GroqProvider] Sending completion request...');
      const start = Date.now();

      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Fast, robust model for JSON tasks
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // Enforce JSON mode
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - start;
      logger.info(`[GroqProvider] Request complete. Latency: ${latency}ms`);

      return response.choices[0].message.content || '';
    } catch (err: any) {
      logger.error('Groq Provider error:', err);
      const statusCode = err.status || 502;
      throw new AIError(`Groq API call failed: ${err.message}`, statusCode);
    }
  }
}
