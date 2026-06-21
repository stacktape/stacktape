import { ExpectedError } from '@utils/errors';
import { PromptManager, UserCancelledError } from './prompts';
import { scrollbackFeed } from './scrollback-feed';
import { tuiState } from './state';
import type { TuiPrompt, TuiSelectOption } from './types';

type AutoAnswerLogger = (message: string) => void;

type PromptContext = { isEnabled: boolean; isTTY: boolean };

/**
 * Single routing point for all user prompts:
 *  - TUI mounted (TTY)     → prompt renders in the split-footer; the answered
 *                            prompt persists as a transcript line in scrollback
 *  - plain interactive TTY → inline `prompts`-package prompt
 *  - non-interactive       → documented default (logged, never silent) or a
 *                            structured error when no default exists
 */
export class PromptSink {
  private promptManager: PromptManager | null = null;

  constructor(private logAutoAnswer: AutoAnswerLogger) {}

  async select({
    config,
    isEnabled,
    isTTY
  }: {
    config: { message: string; options: TuiSelectOption[]; defaultValue?: string };
    isEnabled: boolean;
    isTTY: boolean;
  }): Promise<string> {
    const mode = this.resolveMode({ isEnabled, isTTY });
    if (mode === 'tui') {
      return this.tuiPrompt<string>((resolve, reject) => ({
        type: 'select',
        message: config.message,
        options: config.options,
        defaultValue: config.defaultValue,
        resolve: this.resolveAndClear(resolve, config.message, (value) => {
          const option = config.options.find((o) => o.value === value);
          return option?.label || value;
        }),
        reject: this.rejectAndClear(reject)
      }));
    }
    if (mode === 'auto') {
      return this.autoAnswer({
        message: config.message,
        defaultValue: config.defaultValue,
        describe: (value) => config.options.find((o) => o.value === value)?.label || value
      });
    }
    return this.getPromptManager().select(config);
  }

  async multiSelect({
    config,
    isEnabled,
    isTTY
  }: {
    config: { message: string; options: TuiSelectOption[]; defaultValues?: string[] };
    isEnabled: boolean;
    isTTY: boolean;
  }): Promise<string[]> {
    const mode = this.resolveMode({ isEnabled, isTTY });
    if (mode === 'tui') {
      return this.tuiPrompt<string[]>((resolve, reject) => ({
        type: 'multiSelect',
        message: config.message,
        options: config.options,
        defaultValues: config.defaultValues,
        resolve: this.resolveAndClear(resolve, config.message, (values) =>
          values.map((value) => config.options.find((o) => o.value === value)?.label || value).join(', ')
        ),
        reject: this.rejectAndClear(reject)
      }));
    }
    if (mode === 'auto') {
      return this.autoAnswer({
        message: config.message,
        defaultValue: config.defaultValues,
        describe: (values) =>
          values.map((value) => config.options.find((o) => o.value === value)?.label || value).join(', ')
      });
    }
    return this.getPromptManager().multiSelect(config);
  }

  async confirm({
    config,
    isEnabled,
    isTTY
  }: {
    config: { message: string; defaultValue?: boolean };
    isEnabled: boolean;
    isTTY: boolean;
  }): Promise<boolean> {
    const mode = this.resolveMode({ isEnabled, isTTY });
    if (mode === 'tui') {
      return this.tuiPrompt<boolean>((resolve, reject) => ({
        type: 'confirm',
        message: config.message,
        defaultValue: config.defaultValue,
        resolve: this.resolveAndClear(resolve, config.message, (value) => (value ? 'yes' : 'no')),
        reject: this.rejectAndClear(reject)
      }));
    }
    if (mode === 'auto') {
      return this.autoAnswer({
        message: config.message,
        defaultValue: config.defaultValue,
        describe: (value) => (value ? 'yes' : 'no')
      });
    }
    return this.getPromptManager().confirm(config);
  }

  async text({
    config,
    isEnabled,
    isTTY
  }: {
    config: {
      message: string;
      placeholder?: string;
      isPassword?: boolean;
      description?: string;
      defaultValue?: string;
    };
    isEnabled: boolean;
    isTTY: boolean;
  }): Promise<string> {
    const mode = this.resolveMode({ isEnabled, isTTY });
    const maskValue = (value: string) => (config.isPassword ? '•'.repeat(value.length) : value);
    if (mode === 'tui') {
      return this.tuiPrompt<string>((resolve, reject) => ({
        type: 'text',
        message: config.message,
        placeholder: config.placeholder,
        isPassword: config.isPassword,
        description: config.description,
        defaultValue: config.defaultValue,
        resolve: this.resolveAndClear(resolve, config.message, maskValue),
        reject: this.rejectAndClear(reject)
      }));
    }
    if (mode === 'auto') {
      return this.autoAnswer({ message: config.message, defaultValue: config.defaultValue, describe: maskValue });
    }
    return this.getPromptManager().text(config);
  }

  /** Rejects a prompt left pending in TUI state (renderer destroyed or failed to mount). */
  rejectPending() {
    const prompt = tuiState.getSnapshot().activePrompt;
    if (!prompt) return;
    if (prompt.reject) {
      try {
        prompt.reject();
      } catch {}
      return;
    }
    tuiState.clearActivePrompt();
  }

  private resolveMode({ isEnabled, isTTY }: PromptContext): 'tui' | 'inline' | 'auto' {
    if (!isTTY) return 'auto';
    return isEnabled ? 'tui' : 'inline';
  }

  private tuiPrompt<T>(buildPrompt: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => TuiPrompt) {
    return new Promise<T>((resolve, reject) => {
      tuiState.setActivePrompt(buildPrompt(resolve, reject));
    });
  }

  private autoAnswer<T>({
    message,
    defaultValue,
    describe
  }: {
    message: string;
    defaultValue: T | undefined;
    describe: (value: T) => string;
  }): T {
    if (defaultValue !== undefined) {
      this.logAutoAnswer(`Non-interactive mode — "${message}" answered with default: ${describe(defaultValue)}`);
      return defaultValue;
    }
    throw new ExpectedError(
      'INPUT',
      `Interactive prompt "${message}" cannot be answered in non-interactive mode.`,
      'Provide the value via command-line arguments, or run in an interactive terminal.'
    );
  }

  private getPromptManager(): PromptManager {
    if (!this.promptManager) {
      this.promptManager = new PromptManager();
    }
    return this.promptManager;
  }

  private resolveAndClear = <T>(resolve: (value: T) => void, message: string, describe: (value: T) => string) => {
    return (value: T) => {
      tuiState.clearActivePrompt();
      scrollbackFeed.push({ kind: 'prompt-answer', message, answer: describe(value) });
      queueMicrotask(() => resolve(value));
    };
  };

  private rejectAndClear = (reject: (reason?: unknown) => void) => {
    return () => {
      tuiState.clearActivePrompt();
      queueMicrotask(() => reject(new UserCancelledError()));
    };
  };
}
