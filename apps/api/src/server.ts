import app from './app';
import { config } from './config/env';
import { logger } from './config/logger';

const host = config.isDev || config.isTest ? '127.0.0.1' : '0.0.0.0';
const port = config.port;

const server = app.listen(port, host, () => {
  logger.info(`🚀 GrowEasy CRM API running in ${config.nodeEnv} mode at http://${host}:${port}`);
  logger.info(`🔒 Pluggable LLM Provider active: "${config.llmProvider}"`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`📡 Received ${signal}. Starting graceful shutdown of server...`);
  
  server.close(() => {
    logger.info('🛑 HTTP server closed. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10s if connections persist
  setTimeout(() => {
    logger.error('⚠️ Force shutdown: connection close timed out.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
