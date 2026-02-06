import { logger } from "./support/logger";

export function exitProcess(code?: string | number | null | undefined) {
  if (process.env.NODE_ENV === "production") {
    process.exit(code);
  } else {
    logger.error("Process not ending in development mode");
  }
}
