import { Request, Response } from 'express';
import { errorHandler, badRequest, notFound } from '../routes/HttpError';
import { DomainError, NotFoundError } from '../models/DomainError';

describe('errorHandler', () => {
  const handle = (error: unknown, headersSent = false) => {
    const res = {
      headersSent,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as unknown as Response;
    const next = jest.fn();
    errorHandler(error, {} as Request, res, next);
    return { res, next };
  };

  test('reports an HttpError with its status and message', () => {
    const { res } = handle(notFound('Class not found'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Class not found' });
    expect(badRequest('x').status).toBe(400);
  });

  test('reports a middleware error that carries a status (e.g. malformed JSON) with that status', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected token'), { status: 400 });
    const { res } = handle(parseError);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected token' });
  });

  test('reports a DomainError as a 400 with its message', () => {
    const { res } = handle(new DomainError('Student with this CPF already exists'));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Student with this CPF already exists' });
  });

  test('reports a NotFoundError (something the request names does not exist) as a 404', () => {
    const { res } = handle(new NotFoundError('Student not enrolled in this class'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Student not enrolled in this class' });
  });

  test('reports any other error as a 500 without its message, and logs it', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { res } = handle(new TypeError('Cannot read properties of undefined'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  test('delegates to the next handler when the response has already started', () => {
    const error = new Error('late');
    const { res, next } = handle(error, true);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
