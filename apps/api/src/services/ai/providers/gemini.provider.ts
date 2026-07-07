import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from './provider.interface';
import { config } from '../../../config/env';
import { AIError } from '../../../utils/errors';
import { logger } from '../../../config/logger';

export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  public async extractLeads(
    records: any[],
    systemPrompt: string,
    extractionPromptTemplate: string
  ): Promise<string> {
    if (!this.genAI) {
      throw new AIError('Gemini API Key is missing or invalid. Check your configuration.', 401);
    }

    const userPrompt = extractionPromptTemplate.replace('{{records}}', JSON.stringify(records, null, 2));
    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${userPrompt}`;

    try {
      logger.debug('[GeminiProvider] Sending content generation request...');
      const start = Date.now();

      // Use gemini-1.5-flash as default, fallback to gemini-pro if needed
      const modelName = 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        } as any, // Cast as any because responseMimeType might not be in the older types, but it is supported by API
      });

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const latency = Date.now() - start;
      logger.info(`[GeminiProvider] Request complete. Latency: ${latency}ms`);

      return text || '';
    } catch (err: any) {
      logger.error('Gemini Provider error:', err);
      throw new AIError(`Gemini API call failed: ${err.message}`, 502);
    }
  }
}
