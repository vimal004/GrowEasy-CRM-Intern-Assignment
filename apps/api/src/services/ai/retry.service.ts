import { logger } from '../../config/logger';

interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Executes a function with automatic exponential backoff retries.
 * Retries are triggered for transient status codes (e.g. 429, 500, 502, 503, 504, timeouts)
 * but will fail fast on client errors (400, 403, 422) and validation failures.
 * 
 * @param operation The function to execute.
 * @param config Retry limits and backoff coefficients.
 * @returns A promise resolving to the operation result.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? 3;
  const initialDelayMs = config.initialDelayMs ?? 1000;
  const backoffFactor = config.backoffFactor ?? 2;

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      const isLastAttempt = attempt === maxRetries;
      const statusCode = err.statusCode || err.status || 500;

      // Determine if error is transient (retryable)
      // Retry on Rate Limit (429), server errors (5xx), network timeouts, or unknown errors
      const isRetryable =
        statusCode === 429 ||
        (statusCode >= 500 && statusCode < 600) ||
        err.message.includes('timeout') ||
        err.message.includes('ETIMEDOUT') ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT';

      if (!isRetryable || isLastAttempt) {
        if (isLastAttempt) {
          logger.error(`[RetryService] Operation failed after ${maxRetries} attempts.`);
        }
        throw err;
      }

      logger.warn(
        `[RetryService] Attempt ${attempt} failed with status ${statusCode}. Retrying in ${delay}ms... Error: ${err.message}`
      );

      // Sleep before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }

  throw new Error('Unreachable retry condition');
}
