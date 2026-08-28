import { ExpectedError } from '@utils/errors';
import { stripAnsi } from '../format/text';
import { interactionCoordinator } from '../interaction/coordinator';
import type { TuiSelectOption } from '../types';
import { PromptManager } from './inline';

const plainOptions = (options: TuiSelectOption[]): TuiSelectOption[] =>
  options.map((option) => ({
    ...option,
    label: stripAnsi(option.label),
    ...(option.description !== undefined && { description: stripAnsi(option.description) })
  }));

type AutoAnswerLogger = (message: string) => void;
type PromptContext = { isEnabled: boolean; isTTY: boolean };

export class PromptSink {
  private promptManager: PromptManager | null = null;

  constructor(
    private logAutoAnswer: AutoAnswerLogger,
    private runWithPromptSurface: <T>(run: () => Promise<T>) => Promise<T> = (run) => run()
  ) {}

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
    if (mode === 'dashboard') {
      return this.runWithPromptSurface(() =>
        interactionCoordinator.openPrompt<string>({
          prompt: {
            type: 'select',
            message: stripAnsi(config.message),
            options: plainOptions(config.options),
            defaultValue: config.defaultValue
          },
          describe: (value) => config.options.find((option) => option.value === value)?.label ?? value
        })
      );
    }
    if (mode === 'auto') {
      return this.autoAnswer({
        message: config.message,
        defaultValue: config.defaultValue,
        describe: (value) => config.options.find((option) => option.value === value)?.label ?? value
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
    if (mode === 'dashboard') {
      return this.runWithPromptSurface(() =>
        interactionCoordinator.openPrompt<string[]>({
          prompt: {
            type: 'multiSelect',
            message: stripAnsi(config.message),
            options: plainOptions(config.options),
            defaultValues: config.defaultValues
          },
          describe: (values) =>
            values.map((value) => config.options.find((option) => option.value === value)?.label ?? value).join(', ')
        })
      );
    }
    if (mode === 'auto') {
      return this.autoAnswer({
        message: config.message,
        defaultValue: config.defaultValues,
        describe: (values) =>
          values.map((value) => config.options.find((option) => option.value === value)?.label ?? value).join(', ')
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
    if (mode === 'dashboard') {
      return this.runWithPromptSurface(() =>
        interactionCoordinator.openPrompt<boolean>({
          prompt: { type: 'confirm', message: stripAnsi(config.message), defaultValue: config.defaultValue },
          describe: (value) => (value ? 'Yes' : 'No')
        })
      );
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
    const mask = (value: string) => (config.isPassword ? 'provided' : value);
    if (mode === 'dashboard') {
      return this.runWithPromptSurface(() =>
        interactionCoordinator.openPrompt<string>({
          prompt: {
            type: 'text',
            message: stripAnsi(config.message),
            placeholder: config.placeholder === undefined ? undefined : stripAnsi(config.placeholder),
            isPassword: config.isPassword,
            description: config.description === undefined ? undefined : stripAnsi(config.description),
            defaultValue: config.defaultValue
          },
          describe: mask,
          sensitive: config.isPassword
        })
      );
    }
    if (mode === 'auto') {
      return this.autoAnswer({ message: config.message, defaultValue: config.defaultValue, describe: mask });
    }
    return this.getPromptManager().text(config);
  }

  rejectPending() {
    interactionCoordinator.rejectAllPending();
  }

  private resolveMode({ isEnabled, isTTY }: PromptContext): 'dashboard' | 'inline' | 'auto' {
    if (!isTTY) return 'auto';
    return isEnabled ? 'dashboard' : 'inline';
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
    this.promptManager ??= new PromptManager();
    return this.promptManager;
  }
}
