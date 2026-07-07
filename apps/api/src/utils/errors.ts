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
