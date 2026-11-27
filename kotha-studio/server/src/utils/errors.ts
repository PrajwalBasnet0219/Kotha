export interface FieldIssue {
  path: string;
  message: string;
}

/** Every failure in the API is one of these. The error handler maps it to a response. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: FieldIssue[];
  readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: FieldIssue[],
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.meta = meta;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message = 'Malformed request', fields?: FieldIssue[]) =>
  new AppError(400, 'VALIDATION_FAILED', message, fields);

export const unauthorized = (code = 'TOKEN_INVALID', message = 'Authentication required') =>
  new AppError(401, code, message);

export const forbidden = (message = 'You do not have access to this resource', code = 'FORBIDDEN') =>
  new AppError(403, code, message);

export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);

export const conflict = (code: string, message: string, fields?: FieldIssue[]) =>
  new AppError(409, code, message, fields);

export const unprocessable = (code: string, message: string, fields?: FieldIssue[], meta?: Record<string, unknown>) =>
  new AppError(422, code, message, fields, meta);

export const gone = (message = 'This link has expired or already been used') =>
  new AppError(410, 'TOKEN_EXPIRED', message);

export const tooLarge = (message = 'File is too large') => new AppError(413, 'PAYLOAD_TOO_LARGE', message);

export const unsupportedMedia = (message = 'Unsupported file type') =>
  new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', message);

export const tooMany = (message = 'Too many requests', retryAfter = 60) =>
  new AppError(429, 'RATE_LIMITED', message, undefined, { retryAfter });

export const badGateway = (message = 'The upstream service did not answer') =>
  new AppError(502, 'UPSTREAM_ERROR', message);

export const paymentRequired = (message = 'Payment was not completed') =>
  new AppError(402, 'PAYMENT_INCOMPLETE', message);
