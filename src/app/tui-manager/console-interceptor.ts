type ConsoleLogLevel = 'info' | 'warn' | 'error';

type ConsoleInterceptorHandlers = {
  onMessage: (props: { level: ConsoleLogLevel; source: string; message: string }) => void;
};

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

  start({ onMessage }: ConsoleInterceptorHandlers) {
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
