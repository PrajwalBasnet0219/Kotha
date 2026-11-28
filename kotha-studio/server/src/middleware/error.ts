import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { AppError, type FieldIssue } from '../utils/errors';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: FieldIssue[];
  };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No route matches ${req.method} ${req.path}`));
};

const zodFields = (error: ZodError): FieldIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));

/**
 * The single exit point for failures. Everything becomes
 * `{ error: { code, message, fields? } }` and nothing leaks a stack trace.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Try again.';
  let fields: FieldIssue[] | undefined;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    fields = err.fields;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_FAILED';
    message = 'Some fields need attention';
    fields = zodFields(err);
  } else if ((err as { type?: string })?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is larger than 32kb';
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body is not valid JSON';
  } else if ((err as { code?: number })?.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    message = 'That value is already in use';
  }

  if (status >= 500) {
    logger.error({ err, requestId: req.id }, 'unhandled request error');
  }

  const body: ErrorBody = { error: { code, message } };
  if (fields && fields.length > 0) body.error.fields = fields;

  res.status(status).json(body);
};
