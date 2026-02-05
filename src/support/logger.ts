import { createLogger, format, transports } from 'winston';
import { ENV } from '../environment';

export const logger = createLogger({
  level: ENV.LOGGING_LEVEL,
  format: format.combine(format.errors({ stack: true }), format.prettyPrint()),
  transports: [new transports.Console({ forceConsole: true })],
});