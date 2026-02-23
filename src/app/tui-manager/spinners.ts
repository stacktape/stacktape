import { formatDuration } from './utils';
import { stripAnsi } from './utils';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export type Spinner = {
  update: (text: string) => void;
  success: (options?: { text?: string; details?: string }) => void;
  error: (text?: string) => void;
};

let _devTuiActive = false;
let _agentMode = false;
let _guidedMode = false;

export const setSpinnerDevTuiActive = (active: boolean) => {
  _devTuiActive = active;
};

export const isSpinnerDevTuiActive = () => _devTuiActive;

export const setSpinnerAgentMode = (active: boolean) => {
  _agentMode = active;
};

export const isSpinnerAgentMode = () => _agentMode;

export const setSpinnerGuidedMode = (active: boolean) => {
  _guidedMode = active;
};

export const isSpinnerGuidedMode = () => _guidedMode;

export const createSpinner = (text: string, colorize: (color: string, text: string) => string): Spinner => {
  if (_devTuiActive) {
    return { update: () => {}, success: () => {}, error: () => {} };
  }

  if (_agentMode) {
    const startTime = Date.now();
    console.log(`[i] ${text}`);
    return {
      update: (newText: string) => {
        console.log(`[i] ${text} - ${newText}`);
      },
      success: (options?: { text?: string; details?: string }) => {
        const duration = formatDuration(Date.now() - startTime);
        const finalText = options?.text || text;
        const details = options?.details ? ` ${options.details}` : '';
        console.log(`[+] ${finalText}${details} (${duration})`);
      },
      error: (errorText?: string) => {
        const duration = formatDuration(Date.now() - startTime);
        console.log(`[x] ${errorText || `${text} failed`} (${duration})`);
      }
    };
  }

  const baseText = text;
  const startTime = Date.now();
  let stopped = false;
  let lastUpdateText = '';
  let spinnerFrame = 0;
  const canInlineUpdate = !!process.stdout.isTTY || process.env.FORCE_TTY === '1';
  let previousLineLength = 0;
  let cursorHidden = false;

  const hideCursor = () => {
    if (!canInlineUpdate || cursorHidden) return;
    process.stdout.write('\x1B[?25l');
    cursorHidden = true;
  };

  const showCursor = () => {
    if (!canInlineUpdate || !cursorHidden) return;
    process.stdout.write('\x1B[?25h');
    cursorHidden = false;
  };

  const renderLine = (line: string) => {
    if (!canInlineUpdate) {
      console.info(line);
      console.info('');
      return;
    }
    hideCursor();
    const plainLength = stripAnsi(line).length;
    const tailPadding = previousLineLength > plainLength ? ' '.repeat(previousLineLength - plainLength) : '';
    process.stdout.write(`\r${line}${tailPadding}`);
    previousLineLength = plainLength;
  };

  const renderRunningLine = () => {
    const spinner = colorize('cyan', SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length]);
    const updatePart = lastUpdateText ? ` ${colorize('gray', lastUpdateText)}` : '';
    renderLine(`${spinner} ${baseText}${updatePart}`);
    spinnerFrame++;
  };

  if (canInlineUpdate) {
    renderRunningLine();
  }
  const spinnerInterval = canInlineUpdate
    ? setInterval(() => {
        if (_devTuiActive || stopped) return;
        renderRunningLine();
      }, 90)
    : null;

  return {
    update: (newText: string) => {
      if (_devTuiActive || stopped) return;
      lastUpdateText = newText;
      if (canInlineUpdate) {
        renderRunningLine();
      }
    },
    success: (options?: { text?: string; details?: string }) => {
      if (_devTuiActive || stopped) return;
      stopped = true;
      if (spinnerInterval) clearInterval(spinnerInterval);
      const duration = colorize('yellow', formatDuration(Date.now() - startTime));
      const finalText = options?.text || baseText;
      const details = options?.details ? ` ${colorize('gray', options.details)}` : '';
      const updatePart = lastUpdateText ? ` ${colorize('gray', lastUpdateText)}` : '';
      renderLine(`${colorize('green', '√')} ${finalText}${updatePart}${details} ${duration}`);
      if (canInlineUpdate) {
        showCursor();
        process.stdout.write('\n\n');
      }
    },
    error: (errorText?: string) => {
      if (_devTuiActive || stopped) return;
      stopped = true;
      if (spinnerInterval) clearInterval(spinnerInterval);
      const duration = colorize('yellow', formatDuration(Date.now() - startTime));
      renderLine(`${colorize('red', '✖')} ${errorText || `${baseText} failed`} ${duration}`);
      if (canInlineUpdate) {
        showCursor();
        process.stdout.write('\n\n');
      }
    }
  };
};

type SpinnerState = {
  baseText: string;
  currentText: string;
  status: 'running' | 'success' | 'error';
  startTime: number;
  finalLine?: string;
};

export class MultiSpinner {
  private spinners: Map<string, SpinnerState> = new Map();
  private colorize: (color: string, text: string) => string;
  private suppressed: boolean;
  private agentMode: boolean;

  constructor(colorize: (color: string, text: string) => string) {
    this.colorize = colorize;
    this.suppressed = _devTuiActive;
    this.agentMode = _agentMode;
  }

  add(id: string, text: string): Spinner {
    if (this.suppressed) {
      return {
        update: () => {},
        success: () => {},
        error: () => {}
      };
    }

    if (this.agentMode) {
      const startTime = Date.now();
      console.log(`[i] ${text}`);
      return {
        update: (newText: string) => {
          console.log(`[i] ${text} - ${newText}`);
        },
        success: (options?: { text?: string; details?: string }) => {
          const duration = formatDuration(Date.now() - startTime);
          const finalText = options?.text || text;
          const details = options?.details ? ` ${options.details}` : '';
          console.log(`[+] ${finalText}${details} (${duration})`);
        },
        error: (errorText?: string) => {
          const duration = formatDuration(Date.now() - startTime);
          console.log(`[x] ${errorText || `${text} failed`} (${duration})`);
        }
      };
    }

    const startTime = Date.now();
    this.spinners.set(id, {
      baseText: text,
      currentText: text,
      status: 'running',
      startTime
    });
    console.info(`${this.colorize('cyan', SPINNER_FRAMES[0])} ${text}`);

    return {
      update: (newText: string) => {
        const spinner = this.spinners.get(id);
        if (spinner && spinner.status === 'running') {
          spinner.currentText = `${spinner.baseText} ${this.colorize('gray', newText)}`;
        }
      },
      success: (options?: { text?: string; details?: string }) => {
        const spinner = this.spinners.get(id);
        if (spinner) {
          const duration = Date.now() - spinner.startTime;
          const durationStr = this.colorize('yellow', formatDuration(duration));
          const finalText = options?.text || spinner.baseText;
          const details = options?.details ? ` ${this.colorize('gray', options.details)}` : '';
          spinner.status = 'success';
          spinner.finalLine = `${this.colorize('green', '√')} ${finalText}${details} ${durationStr}`;
          console.info(spinner.finalLine);
          this.checkIfAllDone();
        }
      },
      error: (errorText?: string) => {
        const spinner = this.spinners.get(id);
        if (spinner) {
          const duration = Date.now() - spinner.startTime;
          const durationStr = this.colorize('yellow', formatDuration(duration));
          spinner.status = 'error';
          spinner.finalLine = `${this.colorize('red', '✖')} ${errorText || `${spinner.baseText} failed`} ${durationStr}`;
          console.info(spinner.finalLine);
          this.checkIfAllDone();
        }
      }
    };
  }

  private checkIfAllDone() {
    const allDone = Array.from(this.spinners.values()).every((s) => s.status !== 'running');
    if (allDone) {
      this.stop();
    }
  }

  private stop() {
    this.spinners.clear();
  }
}

export const createSpinnerProgressLogger = (
  spinner: Spinner,
  instanceId: string,
  parentEventType: LoggableEventType = 'PACKAGE_ARTIFACTS'
): ProgressLogger & { getLastFinalMessage: () => string | undefined } => {
  let lastDescription = '';
  let lastFinalMessage: string | undefined;

  return {
    get eventContext() {
      return { instanceId, parentEventType };
    },
    startEvent: async ({ description }: { description: string }) => {
      lastDescription = description;
      spinner.update(description);
    },
    updateEvent: async ({ additionalMessage }: { additionalMessage?: string }) => {
      if (additionalMessage) {
        spinner.update(`${lastDescription} ${additionalMessage}`);
      }
    },
    finishEvent: async ({ finalMessage }: { finalMessage?: string }) => {
      if (finalMessage) {
        lastFinalMessage = finalMessage;
        spinner.update(finalMessage);
      }
    },
    getLastFinalMessage: () => lastFinalMessage
  };
};
