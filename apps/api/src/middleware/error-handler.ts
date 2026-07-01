import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error (full stack trace)
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation error
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    return res.status(400).json({
      error: firstError.message || 'Invalid input. Please check your details.',
    });
  }

  // Application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Prisma errors (database)
  if (err.constructor.name === 'PrismaClientValidationError') {
    return res.status(500).json({
      error: 'Database error. Please try again or contact support.',
    });
  }

  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database constraint error. This record may already exist.',
    });
  }

  // Default error - hide technical details from user
  res.status(500).json({
    error: 'Something went wrong. Please try again later.',
  });
};
