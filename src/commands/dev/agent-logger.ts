import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs-extra';
import { dirname } from 'node:path';

export type LogLevel = 'info' | 'warn' | 'error';

type LogEntry = {
  ts: number; // Unix timestamp ms for efficient comparison
  source: string;
  level: LogLevel;
  message: string;
};

let logFilePath: string | null = null;
let logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Initialize the agent logger with a file path.
 */
export const initAgentLogger = (filePath: string) => {
  logFilePath = filePath;
  logBuffer = [];

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, '');
};

/**
 * Format timestamp as HH:MM:SS for compact log output.
 */
const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Log a message to the agent log file.
 * Compact format: HH:MM:SS source level message
 */
export const agentLog = (source: string, message: string, level: LogLevel = 'info') => {
  const ts = Date.now();
  const entry: LogEntry = { ts, source, level, message };

  // Add to buffer with size limit
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Write to file
  if (logFilePath) {
    // Compact format: only show level if not info
    const levelStr = level === 'info' ? '' : ` ${level.toUpperCase()}`;
    const line = `${formatTime(ts)} [${source}]${levelStr} ${message}\n`;
    try {
      appendFileSync(logFilePath, line);
    } catch {
      // Ignore write errors
    }
  }
};

/**
 * Get logs from buffer. Uses cursor-based pagination.
 */
export const getAgentLogs = (options?: {
  since?: number; // Cursor from previous response (Unix timestamp ms)
  limit?: number;
  workload?: string;
}): { logs: string[]; nextCursor: number } => {
  const { since, limit = 50, workload } = options || {};

  let filtered = logBuffer;

  // Filter by cursor (timestamp)
  if (since) {
    filtered = filtered.filter((entry) => entry.ts > since);
  }

  // Filter by workload/source
  if (workload) {
    filtered = filtered.filter((entry) => entry.source === workload);
  }

  // Take last N entries
  const limited = filtered.slice(-limit);

  // Format as compact lines
  const logs = limited.map((entry) => {
    const levelStr = entry.level === 'info' ? '' : ` ${entry.level.toUpperCase()}`;
    return `${formatTime(entry.ts)} [${entry.source}]${levelStr} ${entry.message}`;
  });

  // Next cursor is timestamp of last entry + 1
  const lastEntry = limited[limited.length - 1];
  const nextCursor = lastEntry ? lastEntry.ts + 1 : Date.now();

  return { logs, nextCursor };
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
  logBuffer = [];
};
