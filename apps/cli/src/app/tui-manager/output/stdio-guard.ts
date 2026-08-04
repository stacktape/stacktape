import { stripAnsi } from '../format/text';

type ConsoleLogLevel = 'info' | 'warn' | 'error';

type ConsoleInterceptorHandlers = {
  onMessage: (props: { level: ConsoleLogLevel; source: string; message: string }) => void;
  passthrough?: boolean;
};

type JsonlViolationHandler = (props: { level: 'warn' | 'error'; source: string; message: string }) => void;

const isValidJsonlRecordLine = (line: string) => {
  try {
    const parsed = JSON.parse(line) as { type?: unknown };
    if (!parsed || typeof parsed !== 'object') return false;
    return parsed.type === 'event' || parsed.type === 'log' || parsed.type === 'output' || parsed.type === 'result';
  } catch {
    return false;
  }
};

/**
 * In JSONL mode stdout must carry only well-formed JSONL records. This guard
 * wraps process.stdout/stderr writes: valid records pass through verbatim,
 * anything else is surfaced to the handler as a structured log record instead
 * of corrupting the machine-readable stream.
 */
export class JsonlStdioGuard {
  private originalStdoutWrite: typeof process.stdout.write | null = null;
  private originalStderrWrite: typeof process.stderr.write | null = null;
  private stdoutBuffer = '';
  private stderrBuffer = '';
  private onViolation: JsonlViolationHandler = () => {};

  get enabled() {
    return this.originalStdoutWrite !== null;
  }

  enable({ onViolation }: { onViolation: JsonlViolationHandler }) {
    this.onViolation = onViolation;
    this.enableStdoutGuard();
    this.enableStderrGuard();
  }

  disable() {
    this.disableStdoutGuard();
    this.disableStderrGuard();
  }

  private emitStdoutViolation(line: string) {
    const message = stripAnsi(line).trim();
    if (!message) return;
    // Avoid double-wrapping: if the raw line is itself a valid JSONL record
    // (e.g. from a re-entrancy edge case or buffer flush), pass it through
    // instead of wrapping it in another log event.
    if (isValidJsonlRecordLine(line.trim())) {
      this.originalStdoutWrite?.(`${line.trim()}\n`);
      return;
    }
    this.onViolation({ level: 'warn', source: 'stdout-raw', message });
  }

  private emitStderrLine(line: string) {
    const message = line.trim();
    if (!message) return;
    this.onViolation({ level: 'error', source: 'stderr', message });
  }

  private enableStdoutGuard() {
    if (this.originalStdoutWrite) return;

    this.originalStdoutWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write;
    this.stdoutBuffer = '';

    process.stdout.write = ((chunk: any, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: any) => {
      const callback = typeof encoding === 'function' ? encoding : typeof cb === 'function' ? cb : undefined;
      const resolvedEncoding = typeof encoding === 'string' ? encoding : undefined;
      const textChunk = Buffer.isBuffer(chunk) ? chunk.toString(resolvedEncoding || 'utf8') : String(chunk ?? '');

      this.stdoutBuffer += textChunk;
      const lines = this.stdoutBuffer.split('\n');
      this.stdoutBuffer = lines.pop() || '';

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          continue;
        }
        if (isValidJsonlRecordLine(trimmed)) {
          this.originalStdoutWrite?.(`${trimmed}\n`);
          continue;
        }
        this.emitStdoutViolation(rawLine);
      }

      callback?.();
      return true;
    }) as typeof process.stdout.write;
  }

  private disableStdoutGuard() {
    if (!this.originalStdoutWrite) return;

    if (this.stdoutBuffer.trim()) {
      this.emitStdoutViolation(this.stdoutBuffer);
    }
    this.stdoutBuffer = '';

    process.stdout.write = this.originalStdoutWrite;
    this.originalStdoutWrite = null;
  }

  private enableStderrGuard() {
    if (this.originalStderrWrite) return;

    this.originalStderrWrite = process.stderr.write.bind(process.stderr) as typeof process.stderr.write;
    this.stderrBuffer = '';

    process.stderr.write = ((chunk: any, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: any) => {
      const callback = typeof encoding === 'function' ? encoding : typeof cb === 'function' ? cb : undefined;
      const resolvedEncoding = typeof encoding === 'string' ? encoding : undefined;
      const textChunk = Buffer.isBuffer(chunk) ? chunk.toString(resolvedEncoding || 'utf8') : String(chunk ?? '');

      this.stderrBuffer += textChunk;
      const lines = this.stderrBuffer.split('\n');
      this.stderrBuffer = lines.pop() || '';

      for (const line of lines) {
        this.emitStderrLine(line);
      }

      callback?.();
      return true;
    }) as typeof process.stderr.write;
  }

  private disableStderrGuard() {
    if (!this.originalStderrWrite) return;

    if (this.stderrBuffer.trim()) {
      this.emitStderrLine(this.stderrBuffer);
    }
    this.stderrBuffer = '';

    process.stderr.write = this.originalStderrWrite;
    this.originalStderrWrite = null;
  }
}

export class ConsoleInterceptor {
  private originalConsole:
    | {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
      }
    | undefined;

  private dispatching = false;

  start({ onMessage, passthrough = false }: ConsoleInterceptorHandlers) {
    if (this.originalConsole) return;

    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };

    console.log = (...args: unknown[]) => {
      if (this.dispatching) {
        this.originalConsole?.log(...args);
        return;
      }
      this.dispatching = true;
      try {
        onMessage({ level: 'info', source: 'console', message: this.stringifyArgs(args) });
        if (passthrough) {
          this.originalConsole?.log(...args);
        }
      } finally {
        this.dispatching = false;
      }
    };
    console.info = (...args: unknown[]) => {
      if (this.dispatching) {
        this.originalConsole?.info(...args);
        return;
      }
      this.dispatching = true;
      try {
        onMessage({ level: 'info', source: 'console', message: this.stringifyArgs(args) });
        if (passthrough) {
          this.originalConsole?.info(...args);
        }
      } finally {
        this.dispatching = false;
      }
    };
    console.warn = (...args: unknown[]) => {
      if (this.dispatching) {
        this.originalConsole?.warn(...args);
        return;
      }
      this.dispatching = true;
      try {
        onMessage({ level: 'warn', source: 'console', message: this.stringifyArgs(args) });
        if (passthrough) {
          this.originalConsole?.warn(...args);
        }
      } finally {
        this.dispatching = false;
      }
    };
    console.error = (...args: unknown[]) => {
      if (this.dispatching) {
        this.originalConsole?.error(...args);
        return;
      }
      this.dispatching = true;
      try {
        onMessage({ level: 'error', source: 'console', message: this.stringifyArgs(args) });
        if (passthrough) {
          this.originalConsole?.error(...args);
        }
      } finally {
        this.dispatching = false;
      }
    };
  }

  stop() {
    if (!this.originalConsole) return;
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    this.originalConsole = undefined;
  }

  private stringifyArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.stack || arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }
}
