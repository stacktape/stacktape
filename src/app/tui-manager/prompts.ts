import type { TuiSelectOption } from './types';
import prompts from 'prompts';
import promptStyle from 'prompts/lib/util/style';

export class UserCancelledError extends Error {
  constructor() {
    super('User cancelled');
    this.name = 'UserCancelledError';
  }
}

type ColorFn = (color: string, text: string) => string;

export class PromptManager {
  private colorize: ColorFn;
  private isTTY: boolean;
  private static didApplyPromptTheme = false;

  constructor(colorize: ColorFn, isTTY: boolean) {
    this.colorize = colorize;
    this.isTTY = isTTY;
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

  async select(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    if (!this.isTTY) {
      return this.handleNonTTY(config.message, config.defaultValue, () => {
        const option = config.options.find((item) => item.value === config.defaultValue);
        return option?.label || config.defaultValue || '';
      });
    }

    const response = await prompts(
      {
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
      },
      {
        onCancel: () => {
          throw new UserCancelledError();
        }
      }
    );

    this.printSpacer();

    return response.value as string;
  }

  async multiSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValues?: string[];
  }): Promise<string[]> {
    if (!this.isTTY) {
      if (config.defaultValues !== undefined) {
        const labels = config.defaultValues
          .map((value) => config.options.find((option) => option.value === value)?.label || value)
          .join(', ');
        console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', labels)} (default)`);
        return config.defaultValues;
      }
      throw new Error(
        `Interactive prompt "${config.message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
      );
    }

    const response = await prompts(
      {
        type: 'multiselect',
        name: 'values',
        message: config.message,
        choices: config.options.map((option) => ({
          title: option.label,
          value: option.value,
          description: option.description
        })),
        hint: '- Space to select. Return to submit',
        instructions: false
      },
      {
        onCancel: () => {
          throw new UserCancelledError();
        }
      }
    );

    const selected = response.values as string[];
    this.printSpacer();
    if (selected.length > 0) return selected;
    return config.defaultValues || [];
  }

  async confirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    if (!this.isTTY) {
      return this.handleNonTTYBoolean(config.message, config.defaultValue);
    }

    const response = await prompts(
      {
        type: 'toggle',
        name: 'value',
        message: config.message,
        initial: false,
        active: 'No',
        inactive: 'Yes'
      },
      {
        onCancel: () => {
          throw new UserCancelledError();
        }
      }
    );

    this.printSpacer();

    return !response.value;
  }

  async text(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    if (!this.isTTY) {
      return this.handleNonTTY(config.message, config.defaultValue, () => {
        if (config.isPassword && config.defaultValue) {
          return '*'.repeat(config.defaultValue.length);
        }
        return config.defaultValue || '';
      });
    }

    const response = await prompts(
      {
        type: config.isPassword ? 'password' : 'text',
        name: 'value',
        message: config.message,
        initial: config.defaultValue,
        ...(config.placeholder ? { placeholder: config.placeholder } : {})
      },
      {
        onCancel: () => {
          throw new UserCancelledError();
        }
      }
    );

    this.printSpacer();

    return (response.value as string) || config.defaultValue || '';
  }

  private handleNonTTY<T>(message: string, defaultValue: T | undefined, formatDefault: () => string): T {
    if (defaultValue !== undefined) {
      console.info(`${this.colorize('cyan', 'ℹ')} ${message} ${this.colorize('cyan', formatDefault())} (default)`);
      this.printSpacer();
      return defaultValue;
    }
    throw new Error(
      `Interactive prompt "${message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
    );
  }

  private handleNonTTYBoolean(message: string, defaultValue: boolean | undefined): boolean {
    if (defaultValue !== undefined) {
      const answer = defaultValue ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
      console.info(`${this.colorize('cyan', 'ℹ')} ${message} ${answer} (default)`);
      this.printSpacer();
      return defaultValue;
    }
    throw new Error(
      `Interactive prompt "${message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
    );
  }
}
