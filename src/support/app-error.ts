export default class AppError extends Error {
  statusCode?: number;
  isOperational: boolean;

  constructor(statusCode?: number, message = '', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

export function isError(obj: unknown) {
  return obj instanceof Error;
}

/**
 * Returns true if either of the following conditions is matched:
 * - The error is an `AppError` and is marked as an operational error
 * - The error has the `expose` attribute (comes from the `body-parser` package)
 */
export function isOperational(error: Error) {
  return (
    (error instanceof AppError && error.isOperational) ||
    ('expose' in error && error.expose === true)
  );
}