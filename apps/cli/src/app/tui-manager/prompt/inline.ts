import { PassThrough } from 'node:stream';
import type { TuiSelectOption } from '../types';
import prompts from 'prompts';
import promptStyle from 'prompts/lib/util/style';

export class UserCancelledError extends Error {
  constructor() {
    super('User cancelled');
    this.name = 'UserCancelledError';
  }
}

/**
 * Inline terminal prompts for interactive (TTY) sessions where no TUI renderer
 * is mounted. All prompt routing happens in PromptSink — this class is only the
 * `prompts`-package presentation layer.
 */
export class PromptManager {
  private static didApplyPromptTheme = false;

  constructor() {
    this.applyPromptTheme();
  }

  private applyPromptTheme() {
    if (PromptManager.didApplyPromptTheme) return;
    const defaultSymbol = '?';
    promptStyle.symbol = (done: boolean, aborted: boolean, exited: boolean) => {
      if (aborted) return promptStyle.symbols.aborted;
      if (exited) return promptStyle.symbols.exited;
      if (done) return promptStyle.symbols.done;
      return defaultSymbol;
    };
    PromptManager.didApplyPromptTheme = true;
  }

  private printSpacer() {
    console.info('');
  }

  /**
   * `prompts` closes the readline interface it creates on the supplied input.
   * Giving it the real process.stdin can leave Bun's shared TTY stream unable
   * to deliver bytes to the stream presenter afterwards. A disposable proxy
   * confines readline lifecycle changes while forwarding raw terminal input.
   */
  private async run(question: Record<string, unknown>): Promise<Record<string, unknown>> {
    const input = new PassThrough();
    Object.defineProperty(input, 'isTTY', { value: Boolean(process.stdin.isTTY) });
    Object.defineProperty(input, 'isRaw', { get: () => process.stdin.isRaw });
    Object.defineProperty(input, 'setRawMode', {
      value: (enabled: boolean) => {
        if (process.stdin.isTTY) process.stdin.setRawMode(enabled);
        return input;
      }
    });
    const forward = (chunk: Buffer | string) => {
      if (!input.destroyed) input.write(chunk);
    };
    process.stdin.on('data', forward);
    process.stdin.ref();
    process.stdin.resume();
    try {
      return (await prompts({ ...question, stdin: input } as unknown as Parameters<typeof prompts>[0], {
        onCancel: () => {
          throw new UserCancelledError();
        }
      })) as Record<string, unknown>;
    } finally {
      process.stdin.off('data', forward);
      input.end();
      try {
        if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.unref();
      } catch {}
    }
  }

  async select(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    const response = await this.run({
      type: 'select',
      name: 'value',
      message: config.message,
      choices: config.options.map((option) => ({
        title: option.label,
        value: option.value,
        description: option.description
      })),
      initial:
        config.defaultValue !== undefined
          ? Math.max(
              0,
              config.options.findIndex((o) => o.value === config.defaultValue)
            )
          : 0
    });

    this.printSpacer();

    return response.value as string;
  }

  async multiSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValues?: string[];
  }): Promise<string[]> {
    const response = await this.run({
      type: 'multiselect',
      name: 'values',
      message: config.message,
      choices: config.options.map((option) => ({
        title: option.label,
        value: option.value,
        description: option.description,
        selected: config.defaultValues?.includes(option.value) ?? false
      })),
      hint: '- Space to select. Return to submit',
      instructions: false
    });

    const selected = response.values as string[];
    this.printSpacer();
    return selected;
  }

  async confirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    const response = await this.run({
      type: 'toggle',
      name: 'value',
      message: config.message,
      initial: config.defaultValue ?? false,
      active: 'Yes',
      inactive: 'No'
    });

    this.printSpacer();

    return response.value as boolean;
  }

  async text(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    const response = await this.run({
      type: config.isPassword ? 'password' : 'text',
      name: 'value',
      message: config.message,
      initial: config.defaultValue,
      ...(config.placeholder ? { placeholder: config.placeholder } : {})
    });

    this.printSpacer();

    return (response.value as string | undefined) ?? config.defaultValue ?? '';
  }
}
