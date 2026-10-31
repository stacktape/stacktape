import { isAbsolute, relative } from 'node:path';

type DiagnosticPosition = { file: string; line: number; column: number };

const messageFrom = (value: unknown): string => {
  if (typeof value === 'object' && value !== null && 'message' in value && value.message) {
    return String(value.message);
  }
  return String(value);
};

const positionFrom = (value: unknown): DiagnosticPosition | undefined => {
  if (typeof value !== 'object' || value === null || !('position' in value)) return undefined;
  const { position } = value;
  if (typeof position !== 'object' || position === null) return undefined;
  const { file, line, column } = position as Record<string, unknown>;
  if (typeof file !== 'string' || !file || typeof line !== 'number') return undefined;
  return { file, line, column: typeof column === 'number' ? column : 0 };
};

/** A file inside `cwd` relative to it, with forward slashes; a file elsewhere keeps its path. */
export const displayPath = (file: string, cwd: string | undefined) => {
  if (!cwd || !isAbsolute(file)) return file.replaceAll('\\', '/');
  const path = relative(cwd, file);
  return (path && !path.startsWith('..') && !isAbsolute(path) ? path : file).replaceAll('\\', '/');
};

/**
 * One Bun diagnostic: `src/api.ts:12:5: Unexpected ;`. Bun reports the line and the column from 1. Bun's copy of the
 * source line (`lineText`) is left out: the message is recorded in the Stacktape Console and in the operation's log
 * stream, and a source line can hold a credential.
 */
const formatDiagnostic = (diagnostic: unknown, cwd: string | undefined) => {
  const message = messageFrom(diagnostic);
  const position = positionFrom(diagnostic);
  if (!position) return message;
  return `${displayPath(position.file, cwd)}:${position.line}${position.column ? `:${position.column}` : ''}: ${message}`;
};

/**
 * Bun build diagnostics are structural objects (`BuildMessage`) rather than guaranteed `Error` instances, thrown in an
 * `AggregateError` or returned in a failed build's `logs`. Keep each message with its file, line and column, the file
 * relative to `cwd` (the project) when it is inside it.
 */
export const formatBuildError = (error: unknown, { cwd }: { cwd?: string } = {}): string => {
  if (typeof error === 'object' && error !== null && 'errors' in error && Array.isArray(error.errors)) {
    return error.errors.map((diagnostic) => formatDiagnostic(diagnostic, cwd)).join('\n');
  }
  return formatDiagnostic(error, cwd);
};

/** The error diagnostics of a failed build (`Bun.build` with `throw: false`), formatted like a thrown one. */
export const formatBuildLogs = (logs: ReadonlyArray<{ level: string }>, { cwd }: { cwd?: string } = {}): string =>
  logs
    .filter((log) => log.level === 'error')
    .map((log) => formatDiagnostic(log, cwd))
    .join('\n');
