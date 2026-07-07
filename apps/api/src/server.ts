import https from 'https';
import http from 'http';
import app from './app';
import { config } from './config/env';
import { logger } from './config/logger';

const host = config.isDev || config.isTest ? '127.0.0.1' : '0.0.0.0';
const port = config.port;

const server = app.listen(port, host, () => {
  logger.info(`🚀 GrowEasy CRM API running in ${config.nodeEnv} mode at http://${host}:${port}`);
  logger.info(`🔒 Pluggable LLM Provider active: "${config.llmProvider}"`);
  
  if (config.isProd) {
    startKeepAlivePinger();
  }
});

// Render Free Tier Anti-Sleeping Keep-Alive Pinger
function startKeepAlivePinger() {
  const tenMinutesMs = 10 * 60 * 1000;
  logger.info('[Pinger] Initialising Render Free Tier Keep-Alive pinger (every 10 mins)...');

  setInterval(() => {
    // 1. Ping the Next.js Frontend to keep it awake
    const frontendUrl = config.frontendUrl || 'https://groweasy-crm-web.onrender.com';
    logger.info(`[Pinger] Sending keep-alive request to frontend: ${frontendUrl}`);
    const client = frontendUrl.startsWith('https') ? https : http;
    
    client.get(frontendUrl, (res) => {
      logger.info(`[Pinger] Frontend keep-alive status response: ${res.statusCode}`);
    }).on('error', (err) => {
      logger.error(`[Pinger] Frontend keep-alive error: ${err.message}`);
    });

    // 2. Ping this API Backend to keep itself awake
    const selfUrl = process.env.SELF_PUBLIC_URL || 'https://groweasy-crm-api.onrender.com';
    logger.info(`[Pinger] Sending keep-alive request to self: ${selfUrl}/api/health`);
    const selfClient = selfUrl.startsWith('https') ? https : http;
    
    selfClient.get(`${selfUrl}/api/health`, (res) => {
      logger.info(`[Pinger] Self keep-alive status response: ${res.statusCode}`);
    }).on('error', (err) => {
      logger.error(`[Pinger] Self keep-alive error: ${err.message}`);
    });
  }, tenMinutesMs);
}

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
