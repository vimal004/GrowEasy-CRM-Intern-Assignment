import winston from 'winston';
import { config } from './env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  config.isDev
    ? winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `[${info.timestamp}] [${info.level}]: ${info.message}${info.meta ? ' ' + JSON.stringify(info.meta) : ''}`
        )
      )
    : winston.format.json()
);

const transports = [
  new winston.transports.Console(),
];

export const logger = winston.createLogger({
  level: config.isDev ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// Helper for HTTP logging middleware
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
