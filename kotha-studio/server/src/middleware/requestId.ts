import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Every request gets an id that appears in the logs and in every error body. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 64 ? incoming : `req_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  res.setHeader('x-request-id', req.id);
  next();
};
