import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { logger } from './config/logger';
import { BaseError } from './utils/errors';
import uploadRouter from './routes/upload.routes';

const app = express();

// 1. Configure CORS to allow only trusted frontend origins
app.use(
  cors({
    origin: [
      config.frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    methods: ['GET', 'POST'], // Restrict to required HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 2. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Security Headers Middleware (CWE guidelines compliance)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Content Security Policy (strict)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
  );
  
  // Disable rarely used HTTP methods (TRACE, etc.)
  const allowedMethods = ['GET', 'POST'];
  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({
      error: {
        message: `HTTP Method ${req.method} not allowed.`,
        code: 'METHOD_NOT_ALLOWED',
      },
    });
    return;
  }

  next();
});

// 4. Request Logging Middleware (Pino/Winston metrics)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    logger.info(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Latency: ${latency}ms`);
  });
  next();
});

// 5. Mount Routes
app.use('/api', uploadRouter);

// 6. Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof BaseError ? err.statusCode : 500;
  const errorCode = err instanceof BaseError ? err.name : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred on the server.';
  
  // Log detailed error context
  logger.error(`[Error] ${req.method} ${req.originalUrl} - Code: ${errorCode} - Status: ${statusCode} - Error: ${err.message}`, {
    stack: config.isDev ? err.stack : undefined,
    details: err.details,
  });

  const responseBody: any = {
    error: {
      message,
      code: errorCode,
      details: err.details || null,
    },
  };

  // Include stack trace only in development
  if (config.isDev) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
});

export default app;
