import type { TuiSelectOption } from './types';
import * as clack from '@clack/prompts';
import { createInterface } from 'node:readline';

export class UserCancelledError extends Error {
  constructor() {
    super('User cancelled');
    this.name = 'UserCancelledError';
  }
}

type ColorFn = (color: string, text: string) => string;

/**
 * Prompt utilities that work in both TTY and non-TTY modes.
 * Uses @clack/prompts for a clean, modern prompt experience.
 */
export class PromptManager {
  private colorize: ColorFn;
  private isTTY: boolean;

  constructor(colorize: ColorFn, isTTY: boolean) {
    this.colorize = colorize;
    this.isTTY = isTTY;
  }

  /**
   * Prompt user to select one option from a list.
   */
  async select(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    if (!this.isTTY) {
      return this.handleNonTTY(config.message, config.defaultValue, () => {
        const opt = config.options.find((o) => o.value === config.defaultValue);
        return opt?.label || config.defaultValue || '';
      });
    }

    return this.promptSimpleSelect(config);
  }

  /**
   * Prompt user to select multiple options from a list.
   */
  async multiSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValues?: string[];
  }): Promise<string[]> {
    if (!this.isTTY) {
      if (config.defaultValues !== undefined) {
        const labels = config.defaultValues
          .map((v) => config.options.find((o) => o.value === v)?.label || v)
          .join(', ');
        console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', labels)} (default)`);
        return config.defaultValues;
      }
      throw new Error(
        `Interactive prompt "${config.message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
      );
    }

    const result = await clack.multiselect({
      message: config.message,
      options: config.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.description
      })),
      initialValues: config.defaultValues,
      required: false
    });

    if (clack.isCancel(result)) {
      clack.cancel('Operation cancelled');
      throw new UserCancelledError();
    }

    return result as string[];
  }

  /**
   * Prompt user for yes/no confirmation.
   */
  async confirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    if (!this.isTTY) {
      return this.handleNonTTYBoolean(config.message, config.defaultValue);
    }

    return this.promptSimpleConfirm(config);
  }

  private async promptSimpleConfirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    const defaultValue = config.defaultValue ?? true;
    const suffix = defaultValue ? '(Y/n)' : '(y/N)';
    const question = `${this.colorize('cyan', '?')} ${config.message} ${this.colorize('gray', suffix)} `;

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    return await new Promise<boolean>((resolve, reject) => {
      const onCancel = () => {
        rl.close();
        clack.cancel('Operation cancelled');
        reject(new UserCancelledError());
      };

      rl.on('SIGINT', onCancel);
      rl.question(question, (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        if (!normalized) {
          resolve(defaultValue);
          return;
        }
        if (normalized === 'y' || normalized === 'yes') {
          resolve(true);
          return;
        }
        if (normalized === 'n' || normalized === 'no') {
          resolve(false);
          return;
        }
        resolve(defaultValue);
      });
    });
  }

  /**
   * Prompt user for text input.
   */
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

    return this.promptSimpleText(config);
  }

  private async promptSimpleSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValue?: string;
  }): Promise<string> {
    const defaultIndex = config.defaultValue
      ? config.options.findIndex((opt) => opt.value === config.defaultValue)
      : -1;
    const optionsText = config.options
      .map((opt, index) => {
        const label = `${index + 1}) ${opt.label}`;
        const hint = opt.description ? ` ${this.colorize('gray', opt.description)}` : '';
        const isDefault = index === defaultIndex;
        return `  ${label}${hint}${isDefault ? this.colorize('gray', ' (default)') : ''}`;
      })
      .join('\n');

    const rangeHint = `${this.colorize('gray', `Choose 1-${config.options.length}`)}${
      defaultIndex >= 0 ? this.colorize('gray', ` [default ${defaultIndex + 1}]`) : ''
    }`;

    const prompt = `${this.colorize('cyan', '?')} ${config.message}\n${optionsText}\n${rangeHint}: `;

    while (true) {
      const answer = await this.askLine(prompt);
      const normalized = answer.trim();
      if (!normalized) {
        if (defaultIndex >= 0) return config.options[defaultIndex].value;
        continue;
      }

      const selectedIndex = Number.parseInt(normalized, 10);
      if (Number.isFinite(selectedIndex) && selectedIndex >= 1 && selectedIndex <= config.options.length) {
        return config.options[selectedIndex - 1].value;
      }

      const matched = config.options.find(
        (opt) => opt.value.toLowerCase() === normalized.toLowerCase() || opt.label.toLowerCase() === normalized
      );
      if (matched) return matched.value;
    }
  }

  private async promptSimpleText(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    const description = config.description ? ` ${this.colorize('gray', config.description)}` : '';
    const placeholder = config.placeholder ? this.colorize('gray', `(${config.placeholder})`) : '';
    const defaultHint =
      config.defaultValue !== undefined ? this.colorize('gray', ` [default: ${config.defaultValue}]`) : '';
    const prompt = `${this.colorize('cyan', '?')} ${config.message}${description} ${placeholder}${defaultHint} `;

    if (config.isPassword) {
      const value = await this.askHidden(prompt);
      if (value.trim().length === 0 && config.defaultValue !== undefined) {
        return config.defaultValue;
      }
      return value;
    }

    const value = await this.askLine(prompt);
    if (value.trim().length === 0 && config.defaultValue !== undefined) {
      return config.defaultValue;
    }
    return value;
  }

  private async askLine(prompt: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return await new Promise<string>((resolve, reject) => {
      const onCancel = () => {
        rl.close();
        clack.cancel('Operation cancelled');
        reject(new UserCancelledError());
      };

      rl.on('SIGINT', onCancel);
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  private async askHidden(prompt: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const originalWrite = (rl as unknown as { _writeToOutput?: (text: string) => void })._writeToOutput;

    (rl as unknown as { _writeToOutput?: (text: string) => void })._writeToOutput = (text: string) => {
      if (text.includes('\n')) {
        process.stdout.write(text);
      } else {
        process.stdout.write('*');
      }
    };

    return await new Promise<string>((resolve, reject) => {
      const onCancel = () => {
        (rl as unknown as { _writeToOutput?: (text: string) => void })._writeToOutput = originalWrite;
        rl.close();
        clack.cancel('Operation cancelled');
        reject(new UserCancelledError());
      };

      rl.on('SIGINT', onCancel);
      rl.question(prompt, (answer) => {
        (rl as unknown as { _writeToOutput?: (text: string) => void })._writeToOutput = originalWrite;
        rl.close();
        process.stdout.write('\n');
        resolve(answer);
      });
    });
  }

  private handleNonTTY<T>(message: string, defaultValue: T | undefined, formatDefault: () => string): T {
    if (defaultValue !== undefined) {
      console.info(`${this.colorize('cyan', 'ℹ')} ${message} ${this.colorize('cyan', formatDefault())} (default)`);
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
      return defaultValue;
    }
    throw new Error(
      `Interactive prompt "${message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
    );
  }
}
