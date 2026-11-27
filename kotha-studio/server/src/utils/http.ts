import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Lets a controller throw instead of wrapping every body in try/catch. */
export const asyncHandler = (fn: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
  warnings?: unknown[];
  [key: string]: unknown;
}

export const ok = (res: Response, data: unknown, meta?: Meta, status = 200): Response =>
  res.status(status).json(meta ? { data, meta } : { data });

export const created = (res: Response, data: unknown, meta?: Meta): Response => ok(res, data, meta, 201);

export const noContent = (res: Response): Response => res.status(204).send();

export const paginated = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
  extra?: Meta,
): Response =>
  ok(res, data, {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    ...extra,
  });
