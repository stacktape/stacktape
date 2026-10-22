import { parseDefaultSetting } from './input';
import { CliError } from '@utils/errors';
import type {
  ConfigurableCliArgsDefaults,
  ConfigurableOtherDefaults,
  PersistedState
} from '@application-services/global-state-manager/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '@config';
import { localStatePaths } from 'src/config/local-state-paths';

const getDefaults = async (
  persistedData: PersistedState['cliArgsDefaults'] | PersistedState['otherDefaults'],
  defaultsInfo: typeof configurableGlobalDefaultCliArgs | typeof configurableGlobalDefaultOtherProps
) => {
  const result = {};
  for await (const [propName, prop] of Object.entries(defaultsInfo)) {
    const currentValue = persistedData[propName] || prop.default;
    const hasValue = currentValue !== undefined && currentValue !== null;
    const currentValueRedacted = prop.isSensitive ? maskString(currentValue) : currentValue;
    const redactedValueToPrint = currentValueRedacted === null ? '<< not-set >>' : currentValueRedacted;

    const inputValue = await tuiManager.promptText({
      message: `${prop.description}:`,
      description: `(leave blank to keep unchanged${hasValue ? ', use whitespace to unset' : ''}, current value: ${redactedValueToPrint})`,
      isPassword: prop.isSensitive
    });
    const isEmptyString = typeof inputValue === 'string' && inputValue.length < 1;
    const shouldUnset = inputValue === ' ';
    if (!isEmptyString) {
      result[propName] = inputValue;
    }
    if (shouldUnset) {
      result[propName] = prop.default;
    }
  }
  return result as ConfigurableCliArgsDefaults | ConfigurableOtherDefaults;
};

export const commandDefaultsConfigure = async () => {
  const { key, value } = globalStateManager.args;
  if (key !== undefined || value !== undefined) {
    if (key === undefined || value === undefined)
      throw new CliError({
        category: 'CLI',
        code: 'CLI_DEFAULT_VALUE_REQUIRED',
        message: 'Use defaults set <key> <value>, or omit both arguments for the interactive prompt.'
      });
    const setting = parseDefaultSetting(key, value);
    await globalStateManager.saveDefaults({
      cliArgsDefaults: {
        ...globalStateManager.persistedState.cliArgsDefaults,
        ...(setting.isCliArg ? { [setting.key]: setting.value } : {})
      },
      otherDefaults: {
        ...globalStateManager.persistedState.otherDefaults,
        ...(!setting.isCliArg ? { [setting.key]: setting.value } : {})
      }
    });
    await globalStateManager.reloadPersistedState();
    tuiManager.success(`Defaults saved to ${tuiManager.prettyFilePath(localStatePaths.persistedStateFile())}.`);
    return;
  }
  const cliArgsDefaults = (await getDefaults(
    globalStateManager.persistedState?.cliArgsDefaults || ({} as any),
    configurableGlobalDefaultCliArgs
  )) as ConfigurableCliArgsDefaults;
  const otherDefaults = (await getDefaults(
    globalStateManager.persistedState?.otherDefaults || ({} as any),
    configurableGlobalDefaultOtherProps
  )) as ConfigurableOtherDefaults;
  await globalStateManager.saveDefaults({ cliArgsDefaults, otherDefaults });
  await globalStateManager.reloadPersistedState();

  tuiManager.success(`Defaults saved to ${tuiManager.prettyFilePath(localStatePaths.persistedStateFile())}.`);
};

const maskString = (input: string | null | undefined): string | null | undefined => {
  if (!input) return input;
  if (input.length <= 4) {
    return input;
  }

  const maskedPart = '*'.repeat(input.length - 4);
  const visiblePart = input.slice(-4);

  return maskedPart + visiblePart;
};
