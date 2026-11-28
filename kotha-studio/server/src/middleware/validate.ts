import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest, type FieldIssue } from '../utils/errors';

type Part = 'body' | 'query' | 'params';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const PARTS: Part[] = ['body', 'query', 'params'];

/**
 * Parses each declared part with Zod, then replaces the request value with the
 * parsed (and coerced) result. Controllers read from `req.validated`.
 */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const fields: FieldIssue[] = [];
    const parsed: NonNullable<Request['validated']> = { ...(req.validated ?? {}) };

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          fields.push({
            path: [part, ...issue.path.map(String)].join('.'),
            message: issue.message,
          });
        }
        continue;
      }

      parsed[part] = result.data;
      if (part === 'body') req.body = result.data;
      if (part === 'query') req.query = result.data as Request['query'];
      if (part === 'params') req.params = result.data as Request['params'];
    }

    if (fields.length > 0) {
      return next(badRequest('Some fields need attention', fields));
    }

    req.validated = parsed;
    next();
  };

/** Typed access to a value that `validate` already parsed. */
export const validated = <T>(req: Request, part: Part): T => {
  const value = req.validated?.[part];
  if (value === undefined) throw badRequest('Request was not validated');
  return value as T;
};
