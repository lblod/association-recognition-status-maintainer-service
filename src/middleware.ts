import { Response } from "express";
import AppError, { isOperational } from "./support/app-error";
import { logger } from "./support/logger";
import { StatusCodes } from "http-status-codes";

export const errorHandler = (error: Error, res?: Response) => {
  if (!isOperational(error)) {
    logger.error('Handling non-operational error: ', error);
    if (res && !res.headersSent) {
      res.status(500).json({ errors: [{ title: 'An unknown error occured' }] });
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.error('Process not ending in development mode');
    }
  } else {
    logger.error('Handling operational error: ', error);
    if (res && !res.headersSent) {
      const statusCode =
        error instanceof AppError && error.statusCode
          ? error.statusCode
          : StatusCodes.INTERNAL_SERVER_ERROR;
      res.status(statusCode).json({ errors: [{ title: error.message }] });
    }
  }
};