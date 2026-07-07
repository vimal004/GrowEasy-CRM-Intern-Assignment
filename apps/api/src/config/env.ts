import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  OPENAI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  LLM_PROVIDER: z.enum(['openai', 'gemini', 'groq', 'mock']).optional(),
  BATCH_SIZE: z.coerce.number().int().positive().default(10),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5242880), // 5MB in bytes
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:', parsedEnv.error.format());
  process.exit(1);
}

const rawConfig = parsedEnv.data;

// Resolve actual provider based on configuration and available API keys
const resolveLlmProvider = (): 'openai' | 'gemini' | 'groq' | 'mock' => {
  if (rawConfig.LLM_PROVIDER) {
    return rawConfig.LLM_PROVIDER;
  }

  const isOpenAiValid = rawConfig.OPENAI_API_KEY && 
                        rawConfig.OPENAI_API_KEY !== 'your_openai_api_key_here' && 
                        rawConfig.OPENAI_API_KEY.trim() !== '';

  const isGeminiValid = rawConfig.GEMINI_API_KEY && 
                        rawConfig.GEMINI_API_KEY !== 'your_gemini_api_key_here' && 
                        rawConfig.GEMINI_API_KEY.trim() !== '';

  const isGroqValid = rawConfig.GROQ_API_KEY && 
                      rawConfig.GROQ_API_KEY !== 'your_groq_api_key_here' && 
                      rawConfig.GROQ_API_KEY.trim() !== '';

  if (isOpenAiValid) return 'openai';
  if (isGeminiValid) return 'gemini';
  if (isGroqValid) return 'groq';

  return 'mock';
};

export const config = {
  port: rawConfig.PORT,
  nodeEnv: rawConfig.NODE_ENV,
  frontendUrl: rawConfig.FRONTEND_URL,
  openaiApiKey: rawConfig.OPENAI_API_KEY,
  geminiApiKey: rawConfig.GEMINI_API_KEY,
  groqApiKey: rawConfig.GROQ_API_KEY,
  llmProvider: resolveLlmProvider(),
  batchSize: rawConfig.BATCH_SIZE,
  maxFileSize: rawConfig.MAX_FILE_SIZE,
  isDev: rawConfig.NODE_ENV === 'development',
  isProd: rawConfig.NODE_ENV === 'production',
  isTest: rawConfig.NODE_ENV === 'test',
};

export type Config = typeof config;
