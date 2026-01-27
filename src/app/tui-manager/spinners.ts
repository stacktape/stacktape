import { spinner as clackSpinner } from '@clack/prompts';
import logUpdate from 'log-update';
import { formatDuration } from './utils';

export type Spinner = {
  /** Update the spinner text (shown in gray after the base text) */
  update: (text: string) => void;
  /** Mark as successful with optional details */
  success: (options?: { text?: string; details?: string }) => void;
  /** Mark as failed with optional error message */
  error: (text?: string) => void;
};

// Flag to suppress spinner output when DevTui is active
let _devTuiActive = false;

export const setSpinnerDevTuiActive = (active: boolean) => {
  _devTuiActive = active;
};

export const isSpinnerDevTuiActive = () => _devTuiActive;

/**
 * Creates a single spinner for standalone operations using @clack/prompts spinner.
 * Uses timer indicator to show elapsed time.
 * When DevTui is active, spinners are suppressed (no-op).
 */
export const createSpinner = (text: string, colorize: (color: string, text: string) => string): Spinner => {
  if (_devTuiActive) {
    return { update: () => {}, success: () => {}, error: () => {} };
  }

  const baseText = text;
  const spin = clackSpinner({ indicator: 'timer' });
  spin.start(baseText);

  return {
    update: (newText: string) => {
      if (_devTuiActive) {
        spin.clear();
        return;
      }
      spin.message(`${baseText} ${colorize('gray', newText)}`);
    },
    success: (options?: { text?: string; details?: string }) => {
      if (_devTuiActive) {
        spin.clear();
        return;
      }
      const finalText = options?.text || baseText;
      const details = options?.details ? ` ${colorize('gray', options.details)}` : '';
      spin.stop(`${finalText}${details}`);
    },
    error: (errorText?: string) => {
      if (_devTuiActive) {
        spin.clear();
        return;
      }
      spin.error(errorText || `${baseText} failed`);
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

/**
 * Manages multiple spinners running simultaneously.
 * Use this when you have MULTIPLE async operations running in parallel.
 * When DevTui is active, spinners are suppressed (no-op).
 *
 * @example
 * const multi = new MultiSpinner(colorize);
 * const spinner1 = multi.add('task1', 'Loading config');
 * const spinner2 = multi.add('task2', 'Fetching data');
 * // Both spinners render on separate lines without cursor jumping
 * spinner1.success();
 * spinner2.success({ details: 'Fetched 50 items' });
 */
export class MultiSpinner {
  private spinners: Map<string, SpinnerState> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private colorize: (color: string, text: string) => string;
  private suppressed: boolean;

  constructor(colorize: (color: string, text: string) => string) {
    this.colorize = colorize;
    this.suppressed = _devTuiActive;
  }

  /** Add a new spinner and start tracking it */
  add(id: string, text: string): Spinner {
    // When DevTui is active, return a no-op spinner
    if (this.suppressed) {
      return {
        update: () => {},
        success: () => {},
        error: () => {}
      };
    }

    const startTime = Date.now();
    this.spinners.set(id, {
      baseText: text,
      currentText: text,
      status: 'running',
      startTime
    });
    this.startRendering();

    return {
      update: (newText: string) => {
        const spinner = this.spinners.get(id);
        if (spinner && spinner.status === 'running') {
          spinner.currentText = `${spinner.baseText} ${this.colorize('gray', newText)}`;
          this.render();
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
          spinner.finalLine = `${this.colorize('green', '✓')} ${finalText}${details} ${durationStr}`;
          this.render();
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
          this.render();
          this.checkIfAllDone();
        }
      }
    };
  }

  private startRendering() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.render();
    }, 80);
  }

  private render() {
    const lines: string[] = [];
    for (const [, spinner] of this.spinners) {
      if (spinner.status === 'running') {
        const frame = this.colorize('cyan', this.frames[this.frameIndex]);
        lines.push(`${frame} ${spinner.currentText}`);
      } else {
        lines.push(spinner.finalLine || '');
      }
    }
    logUpdate(lines.join('\n'));
  }

  private checkIfAllDone() {
    const allDone = Array.from(this.spinners.values()).every((s) => s.status !== 'running');
    if (allDone) {
      this.stop();
    }
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logUpdate.done();
  }
}

/**
 * Creates a ProgressLogger that forwards events to a spinner.
 * Use this to adapt packaging/build operations to use spinners.
 *
 * @example
 * const spinner = createSpinner('Packaging', colorize);
 * const logger = createSpinnerProgressLogger(spinner, 'job-123');
 * await packagingManager.packageWorkload({ progressLogger: logger });
 * spinner.success({ details: logger.getLastFinalMessage() });
 */
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
