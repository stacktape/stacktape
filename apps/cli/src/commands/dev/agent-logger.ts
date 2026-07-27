import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs-extra';
import { dirname } from 'node:path';

export type LogLevel = 'info' | 'warn' | 'error';

/**
 * JSONL log entry format.
 * LLMs can easily grep/filter these with standard tools:
 *   grep '"source":"myFunc"' logs.jsonl
 *   grep '"level":"error"' logs.jsonl
 *   tail -n 50 logs.jsonl | jq .
 */
type JsonlLogEntry = {
  ts: string; // ISO 8601 timestamp
  source: string;
  level: LogLevel;
  msg: string;
};

let logFilePath: string | null = null;

/**
 * Initialize the agent logger with a file path.
 * Creates the log file (overwrites if exists).
 */
export const initAgentLogger = (filePath: string) => {
  logFilePath = filePath;

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create empty file
  writeFileSync(filePath, '');
};

/**
 * Log a message to the agent log file in JSONL format.
 * Each line is a valid JSON object for easy parsing.
 */
export const agentLog = (source: string, message: string, level: LogLevel = 'info') => {
  if (!logFilePath) return;

  const entry: JsonlLogEntry = {
    ts: new Date().toISOString(),
    source,
    level,
    msg: message
  };

  try {
    appendFileSync(logFilePath, `${JSON.stringify(entry)}\n`);
  } catch {
    // Ignore write errors
  }
};

/**
 * Get the current log file path.
 */
export const getAgentLogFilePath = (): string | null => {
  return logFilePath;
};

/**
 * Stop the agent logger.
 */
export const stopAgentLogger = () => {
  logFilePath = null;
};
