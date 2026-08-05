import type {
  ConfigurableCliArgsDefaults,
  ConfigurableOtherDefaults,
  PersistedState
} from '@application-services/global-state-manager/types';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '@config';
import { localStatePaths } from 'src/config/local-state-paths';
import { ensureDir, outputJson, readJson } from 'fs-extra';

export const loadPersistedState = async (): Promise<PersistedState> => {
  try {
    const res = await readJson(localStatePaths.persistedStateFile());
    return res;
  } catch {
    const cliArgsDefaults = {};
    const otherDefaults = {};
    for (const propName in configurableGlobalDefaultCliArgs) {
      cliArgsDefaults[propName] = configurableGlobalDefaultCliArgs[propName].default;
    }
    for (const propName in configurableGlobalDefaultOtherProps) {
      otherDefaults[propName] = configurableGlobalDefaultOtherProps[propName].default;
    }
    return {
      systemId: null,
      cliArgsDefaults: cliArgsDefaults as ConfigurableCliArgsDefaults,
      otherDefaults: otherDefaults as ConfigurableOtherDefaults
    };
  }
};

let isStacktapeDataDirAvailable = false;
export const savePersistedState = async (persistedState: PersistedState) => {
  if (!isStacktapeDataDirAvailable) {
    await ensureDir(localStatePaths.userDataDirectory());
    isStacktapeDataDirAvailable = true;
  }
  return outputJson(localStatePaths.persistedStateFile(), persistedState);
};
