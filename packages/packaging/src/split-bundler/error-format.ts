import { isAbsolute, relative } from 'node:path';

type DiagnosticPosition = { file: string; line: number; column: number; lineText?: string };

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
  const { file, line, column, lineText } = position as Record<string, unknown>;
  if (typeof file !== 'string' || !file || typeof line !== 'number') return undefined;
  return {
    file,
    line,
    column: typeof column === 'number' ? column : 0,
    ...(typeof lineText === 'string' ? { lineText } : {})
  };
};

/** A file inside `cwd` relative to it, with forward slashes; a file elsewhere keeps its path. */
export const displayPath = (file: string, cwd: string | undefined) => {
  if (!cwd || !isAbsolute(file)) return file.replaceAll('\\', '/');
  const path = relative(cwd, file);
  return (path && !path.startsWith('..') && !isAbsolute(path) ? path : file).replaceAll('\\', '/');
};

/**
 * One Bun diagnostic: `src/api.ts:12:5: Unexpected ;` with the source line below it. Bun reports the line and the
 * column from 1.
 */
const formatDiagnostic = (diagnostic: unknown, cwd: string | undefined) => {
  const message = messageFrom(diagnostic);
  const position = positionFrom(diagnostic);
  if (!position) return message;
  const location = `${displayPath(position.file, cwd)}:${position.line}${position.column ? `:${position.column}` : ''}`;
  const source = position.lineText?.trim();
  return `${location}: ${message}${source ? `\n    ${source}` : ''}`;
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
