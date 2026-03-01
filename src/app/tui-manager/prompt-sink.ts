import { PromptManager, UserCancelledError } from './prompts';
import { tuiState } from './state';
import type { TuiPromptConfirm, TuiPromptMultiSelect, TuiPromptSelect, TuiPromptText, TuiSelectOption } from './types';

type ColorFn = (color: string, text: string) => string;

export class PromptSink {
  private colorize: ColorFn;
  private promptManager: PromptManager | null = null;
  private promptManagerIsTTY: boolean | null = null;

  constructor(colorize: ColorFn) {
    this.colorize = colorize;
  }

  async select({
    config,
    isEnabled,
    isTTY
  }: {
    config: { message: string; options: TuiSelectOption[]; defaultValue?: string };
    isEnabled: boolean;
    isTTY: boolean;
  }): Promise<string> {
    if (isEnabled && isTTY) {
      return new Promise<string>((resolve, reject) => {
        const prompt: TuiPromptSelect = {
          type: 'select',
          message: config.message,
          options: config.options,
          defaultValue: config.defaultValue,
          resolve: this.resolveAndClear(resolve),
          reject: this.rejectAndClear(reject)
        };
        tuiState.setActivePrompt(prompt);
      });
    }

    return this.getPromptManager(isTTY).select(config);
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
    if (isEnabled && isTTY) {
      return new Promise<string[]>((resolve, reject) => {
        const prompt: TuiPromptMultiSelect = {
          type: 'multiSelect',
          message: config.message,
          options: config.options,
          defaultValues: config.defaultValues,
          resolve: this.resolveAndClear(resolve),
          reject: this.rejectAndClear(reject)
        };
        tuiState.setActivePrompt(prompt);
      });
    }

    return this.getPromptManager(isTTY).multiSelect(config);
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
    if (isEnabled && isTTY) {
      return new Promise<boolean>((resolve, reject) => {
        const prompt: TuiPromptConfirm = {
          type: 'confirm',
          message: config.message,
          defaultValue: config.defaultValue,
          resolve: this.resolveAndClear(resolve),
          reject: this.rejectAndClear(reject)
        };
        tuiState.setActivePrompt(prompt);
      });
    }

    return this.getPromptManager(isTTY).confirm(config);
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
    if (isEnabled && isTTY) {
      return new Promise<string>((resolve, reject) => {
        const prompt: TuiPromptText = {
          type: 'text',
          message: config.message,
          placeholder: config.placeholder,
          isPassword: config.isPassword,
          description: config.description,
          defaultValue: config.defaultValue,
          resolve: this.resolveAndClear(resolve),
          reject: this.rejectAndClear(reject)
        };
        tuiState.setActivePrompt(prompt);
      });
    }

    return this.getPromptManager(isTTY).text(config);
  }

  private getPromptManager(isTTY: boolean): PromptManager {
    if (!this.promptManager || this.promptManagerIsTTY !== isTTY) {
      this.promptManager = new PromptManager(this.colorize, isTTY);
      this.promptManagerIsTTY = isTTY;
    }
    return this.promptManager;
  }

  private resolveAndClear = <T>(resolve: (value: T) => void) => {
    return (value: T) => {
      tuiState.clearActivePrompt();
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
