import { NextFunction, Request, Response } from 'express';
import { DomainError, NotFoundError } from '../models/DomainError';

/** An error that already knows which HTTP status it should be reported with. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, message);
export const notFound = (message: string): HttpError => new HttpError(404, message);

/**
 * Express error handler shared by all routers.
 *
 * - an HttpError, or an error raised by a middleware with its own status
 *   (e.g. malformed JSON), is reported with that status and its message;
 * - a NotFoundError (the request names something that does not exist) is a 404;
 * - any other DomainError (business rule violated by the request) is a 400;
 * - anything else is a bug: it is logged and reported as a 500 without
 *   leaking internal details.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError || hasHttpStatus(error)) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof DomainError) {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error('Unexpected error while handling request:', error);
  res.status(500).json({ error: 'Internal server error' });
}

const hasHttpStatus = (error: unknown): error is { status: number; message: string } =>
  error instanceof Error && typeof (error as { status?: unknown }).status === 'number';
