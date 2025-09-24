// Simple structured logger. In production emits single-line JSON.
// In development prints colorized human-friendly output.
import { env } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface BaseFields {
  msg: string;
  level: LogLevel;
  time: string; // ISO timestamp
  [key: string]: unknown;
}

function format(fields: BaseFields) {
  if (env.NODE_ENV === "production") {
    return JSON.stringify(fields);
  }
  const { msg, level, time, ...rest } = fields;
  const color =
    level === "error"
      ? "\x1b[31m"
      : level === "warn"
      ? "\x1b[33m"
      : level === "debug"
      ? "\x1b[90m"
      : "\x1b[36m"; // info
  const reset = "\x1b[0m";
  return (
    `${color}${time} [${level.toUpperCase()}]${reset} ${msg} ` +
    (Object.keys(rest).length ? JSON.stringify(rest) : "")
  );
}

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const line = format({
    msg,
    level,
    time: new Date().toISOString(),
    ...meta,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit("error", msg, meta),
};

export type Logger = typeof logger;
