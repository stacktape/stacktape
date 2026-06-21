import type { TuiSelectOption } from './types';
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

  async select(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
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
}
