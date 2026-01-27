import type { TuiSelectOption } from './types';
import * as clack from '@clack/prompts';

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

    const result = await clack.select({
      message: config.message,
      options: config.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.description
      })),
      initialValue: config.defaultValue
    });

    if (clack.isCancel(result)) {
      throw new Error('User cancelled');
    }

    return result as string;
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
      throw new Error('User cancelled');
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

    const result = await clack.confirm({
      message: config.message,
      initialValue: config.defaultValue ?? true
    });

    if (clack.isCancel(result)) {
      throw new Error('User cancelled');
    }

    return result as boolean;
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

    const promptFn = config.isPassword ? clack.password : clack.text;
    const result = await promptFn({
      message: config.description ? `${config.message} ${this.colorize('gray', config.description)}` : config.message,
      placeholder: config.placeholder,
      defaultValue: config.defaultValue
    });

    if (clack.isCancel(result)) {
      throw new Error('User cancelled');
    }

    return result as string;
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
