import type { LogLevel } from './agent-logger';

/**
 * A program prints one error or object over many lines: a stack trace, a pretty-printed object, a Python traceback.
 * Dev mode receives its output line by line, and logging each line made one error into many entries, all with the
 * level of the stream. The grouper joins continuation lines to the line that starts the entry, and the entry gets the
 * level its text shows.
 */

/** The longest entry; a program that prints only indented lines still produces entries of bounded size. */
const MAX_ENTRY_LINES = 200;
/** Lines of one entry arrive together; a pause this long ends the entry. */
const ENTRY_QUIET_MS = 50;

const PYTHON_EXCEPTION_LINE = /^[\w.]+(Error|Exception|Warning|Exit|Interrupt)\b/;
/** Go's standard `log` prefix: date, time, and with `Lshortfile` the source position. */
const GO_LOG_PREFIX = /^\d{4}\/\d\d\/\d\d \d\d:\d\d:\d\d(?:\.\d+)? (?:\S+\.go:\d+: )?/;
/** A Go program that crashes prints `panic: ...` or `fatal error: ...` and then the stacks of its goroutines. */
const GO_CRASH_LINE = /^(panic: |fatal error: )/;

/** Whether `line` continues the entry whose lines are `entry`, instead of starting a new one. */
export const isContinuationLine = (line: string, entry: string[]): boolean => {
  if (!entry.length) return false;
  // Stack frames, object properties and traceback lines are indented; a pretty-printed object closes unindented.
  if (/^\s/.test(line) || /^[\]})]/.test(line)) return true;
  if (/^caused by\b/i.test(line)) return true;
  // A Python traceback ends with the unindented exception line.
  if (entry[0]!.startsWith('Traceback (most recent call last)') && PYTHON_EXCEPTION_LINE.test(line)) return true;
  // Node prints the failing source line with a caret under it before the error and its stack.
  if (/^\s*\^+\s*$/.test(entry.at(-1)!)) return true;
  // Everything after a Go crash line is its goroutine dump, also the unindented `goroutine 1 [running]:` lines.
  if (entry.some((entryLine) => GO_CRASH_LINE.test(entryLine))) return true;
  // `log.Panic` logs its message and then panics with it.
  if (entry.length === 1 && line.startsWith('panic: ') && entry[0]!.replace(GO_LOG_PREFIX, '') === line.slice(7)) {
    return true;
  }
  return false;
};

const JSON_LEVELS: Record<string, LogLevel> = {
  fatal: 'error',
  error: 'error',
  critical: 'error',
  warn: 'warn',
  warning: 'warn'
};

const levelFromWord = (word: string): LogLevel =>
  JSON_LEVELS[word.toLowerCase()] ?? (/^(err|panic|crit|alert|emerg)$/i.test(word) ? 'error' : 'info');

/**
 * The level an entry's text shows: a structured `level` field, a level word at the start, an error class with its
 * message, or a stack trace. Without any, standard output and Go `log` lines are `info`, and other standard error stays
 * `warn`, since a program writes both diagnostics and warnings there.
 */
export const detectLogLevel = (text: string, stream: 'stdout' | 'stderr'): LogLevel => {
  const firstLine = text.split('\n', 1)[0]!.trim();
  if (firstLine.startsWith('{')) {
    try {
      const { level } = JSON.parse(firstLine) as { level?: unknown };
      // Pino and Bunyan number their levels: 40 is warn, 50 and above error.
      if (typeof level === 'number') return level >= 50 ? 'error' : level >= 40 ? 'warn' : 'info';
      if (typeof level === 'string') return JSON_LEVELS[level.toLowerCase()] ?? 'info';
    } catch {
      // Not a JSON line; the text decides.
    }
  }
  // A level word starts the line, possibly after a timestamp: `ERROR:root:...`, `[warn] ...`, `12:00:01 INFO ...`,
  // Go's `2026/10/27 13:18:28.123456 main.go:42: ERROR ...` or nginx's `2026/10/27 13:18:28 [crit] ...`.
  const levelWord = firstLine.match(
    /^(?:\d{4}\/\d\d\/\d\d\s+)?(?:\S*\d:\d\d\S*\s+)?(?:\S+\.go:\d+:\s+)?\[?\s*(error|err|fatal|panic|critical|crit|alert|emerg|warn|warning|info|debug|trace)\b/i
  )?.[1];
  if (levelWord) return levelFromWord(levelWord);
  if (/^(uncaught|unhandled)\b/i.test(firstLine) || /^Traceback \(most recent call last\)/.test(firstLine)) {
    return 'error';
  }
  if (/^[\w.$]*(Error|Exception)\b(:|\s*\[|\s*\{|$)/.test(firstLine)) return 'error';
  if (/^\s+at\s.+(:\d+|\(native\))/m.test(text) || /^\s+File ".+", line \d+/m.test(text)) return 'error';
  // A Go crash, possibly after the line `log.Panic` logged, and net/http's recovered handler panics.
  if (/^(panic: |fatal error: |goroutine \d+ \[)/m.test(text)) return 'error';
  // Go's `slog` and logrus text lines carry a logfmt field: `time=... level=ERROR msg=...`. It is read after the error
  // formats, so `TypeError: ... level="debug"` stays an error.
  const fieldLevel = firstLine.match(/(?:^|\s)level="?(\w+)/i)?.[1];
  if (fieldLevel) return levelFromWord(fieldLevel);
  if (/^\(node:\d+\) \w*Warning\b/.test(firstLine)) return 'warn';
  // Go's standard `log` writes every line to standard error with a date and a time and no level. `log.Fatal` adds no
  // level either; its messages usually start with the failure.
  const goMessage = firstLine.match(GO_LOG_PREFIX) && firstLine.replace(GO_LOG_PREFIX, '');
  if (typeof goMessage === 'string') {
    return /^(http: panic serving|panic\b|fatal\b|failed\b|unable to\b|cannot\b|can't\b|could not\b)/i.test(goMessage)
      ? 'error'
      : 'info';
  }
  return stream === 'stderr' ? 'warn' : 'info';
};

/**
 * Joins the lines of one stream into entries and passes each complete entry on. Call `flush` when the stream ends, so
 * the last entry is not held back.
 */
export const createLogLineGrouper = ({
  stream,
  onEntry,
  quietMs = ENTRY_QUIET_MS
}: {
  stream: 'stdout' | 'stderr';
  onEntry: (message: string, level: LogLevel) => void;
  quietMs?: number;
}) => {
  let entry: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!entry.length) return;
    const message = entry.join('\n');
    entry = [];
    onEntry(message, detectLogLevel(message, stream));
  };

  const push = (line: string) => {
    // Blank lines separate the parts of one error as often as two messages, so they never decide.
    if (!line.trim()) return;
    if (!isContinuationLine(line, entry) || entry.length >= MAX_ENTRY_LINES) flush();
    entry.push(line);
    clearTimeout(timer);
    timer = setTimeout(flush, quietMs);
  };

  return { push, flush };
};
