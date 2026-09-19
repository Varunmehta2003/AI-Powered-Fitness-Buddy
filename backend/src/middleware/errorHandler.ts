import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Centralized error handler — must be registered LAST in Express middleware chain.
 * Ensures no raw IBM API errors or credentials are leaked to clients.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;

  // Sanitize: never expose internal IBM API messages that might contain tokens
  const safeMessage = sanitizeErrorMessage(err.message, statusCode);

  const body: ApiError = {
    success: false,
    error: safeMessage,
    code: err.code,
  };

  if (process.env['DEBUG'] === 'true') {
    // Safe debug info — still no secrets
    console.error(`[Error] ${err.message}`);
  }

  res.status(statusCode).json(body);
}

function sanitizeErrorMessage(message: string, statusCode: number): string {
  // Known safe user-facing messages
  if (statusCode === 400) return message;
  if (statusCode === 404) return message;
  if (statusCode === 422) return message;

  // For 5xx errors, use generic message unless it's already a safe one
  const safePatterns = [
    'Fitness Buddy is temporarily unavailable',
    'Invalid request',
    'not found',
    'required',
    'must be',
    'check-in',
    'profile',
    'workout',
    'nutrition',
    'progress',
  ];

  const isSafe = safePatterns.some((p) => message.toLowerCase().includes(p.toLowerCase()));
  if (isSafe) return message;

  return 'Fitness Buddy is temporarily unavailable. Please try again.';
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}
