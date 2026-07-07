export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class UploadError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class FileTooLargeError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 413, details);
  }
}

export class CSVError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 422, details);
  }
}

export class AIError extends BaseError {
  constructor(message: string, statusCode: number = 502, details?: any) {
    super(message, statusCode, details);
  }
}

/**
 * Thrown when a CSV import request exceeds the maximum allowed record count.
 * Returns HTTP 422 (Unprocessable Entity).
 */
export class TooManyRecordsError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 422, details);
  }
}

/**
 * Thrown when backend processing approaches the hosting platform's gateway timeout.
 * Returns HTTP 504 (Gateway Timeout) so the client receives a meaningful error
 * instead of a bare connection reset.
 */
export class GatewayTimeoutError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 504, details);
  }
}
