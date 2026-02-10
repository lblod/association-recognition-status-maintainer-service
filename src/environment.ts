import { z } from "zod";

const LOGGING_LEVELS = [
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly",
] as const;

const EnvSchema = z.object({
  CRON_PATTERN: z.string({
    error: (issue) =>
      issue.input === undefined
        ? "Please provide the `CRON_PATTERN` environment variable"
        : "`CRON_PATTERN` should be of type string",
  }),
  RUN_CRONJOB_ON_START: z.coerce.boolean().default(false),
  LOGGING_LEVEL: z.enum(LOGGING_LEVELS).default("info"),
});

export const ENV = EnvSchema.parse(process.env);
