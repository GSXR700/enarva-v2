import { NextResponse, NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom application error class for operational errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler for API routes.
 * @param error - The error object to handle.
 * @returns A NextResponse object with a standardized error format.
 */
export function errorHandler(error: unknown): NextResponse {
  // Log the error for debugging purposes
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { message: error.message, isOperational: error.isOperational } },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { message: 'Validation failed', details: error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          { error: { message: 'A record with this data already exists.' } },
          { status: 409 } // Conflict
        );
      case 'P2025':
        return NextResponse.json(
          { error: { message: 'The requested record was not found.' } },
          { status: 404 } // Not Found
        );
      default:
        return NextResponse.json(
          { error: { message: 'A database error occurred.', code: error.code } },
          { status: 500 }
        );
    }
  }

  // Fallback for unexpected errors
  return NextResponse.json(
    { error: { message: 'An unexpected internal server error occurred.' } },
    { status: 500 }
  );
}

/**
 * Higher-Order Function (HOF) to wrap API route handlers with error handling.
 * @param handler - The API route handler function to wrap.
 * @returns A new function that executes the handler within a try-catch block.
 */
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return errorHandler(error);
    }
  };
}
