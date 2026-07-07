import OpenAI from 'openai';
import { config } from '../config/env';

// Centralised OpenAI client instance
export const openai = config.openaiApiKey && config.openaiApiKey !== 'your_openai_api_key_here'
  ? new OpenAI({ apiKey: config.openaiApiKey })
  : null;
