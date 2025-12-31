import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '@config';
import { fsPaths } from '@shared/naming/fs-paths';

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

    const res = await tuiManager.prompt({
      type: prop.isSensitive ? 'password' : 'text',
      name: propName,
      message: `${prop.description}. (leave blank to keep unchanged${hasValue ? ', use whitespace to unset' : ''}, current value: ${redactedValueToPrint}):`,
      initial: currentValue
    });
    const isEmptyString = typeof res[propName] === 'string' && (res[propName] as string).length < 1;
    const shouldUnset = res[propName] === ' ';
    if (!isEmptyString) {
      result[propName] = res[propName];
    }
    if (shouldUnset) {
      result[propName] = prop.default;
    }
  }
  return result as ConfigurableCliArgsDefaults | ConfigurableOtherDefaults;
};

export const commandDefaultsConfigure = async () => {
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

  tuiManager.success(`Defaults saved to ${tuiManager.prettyFilePath(fsPaths.persistedStateFilePath())}.`);
};

const maskString = (input: string): string => {
  if (input.length <= 4) {
    return input;
  }

  const maskedPart = '*'.repeat(input.length - 4);
  const visiblePart = input.slice(-4);

  return maskedPart + visiblePart;
};
