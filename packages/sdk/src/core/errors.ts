export class SdkError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'SdkError';
  }
}

export class ValidationError extends SdkError {
  constructor(message: string, body: unknown) {
    super(message, 400, body);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends SdkError {
  constructor(message = 'Unauthorized', body: unknown = null) {
    super(message, 401, body);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends SdkError {
  constructor(message: string, body: unknown) {
    super(message, 409, body);
    this.name = 'ConflictError';
  }
}
