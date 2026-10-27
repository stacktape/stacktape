import type {
  ConfigurableCliArgsDefaults,
  ConfigurableOtherDefaults,
  PersistedState
} from '@application-services/global-state-manager/types';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '@config';
import { localStatePaths } from 'src/config/local-state-paths';
import { chmod, writeFile } from 'node:fs/promises';
import { ensureDir, readJson } from 'fs-extra';

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
  // The file can hold the API key where the operating system's credential store is unavailable, so only the user may
  // read it. `mode` applies only when the file is created; chmod also tightens a file an older version left at 0644.
  const filePath = localStatePaths.persistedStateFile();
  await writeFile(filePath, `${JSON.stringify(persistedState)}\n`, { mode: 0o600 });
  await chmod(filePath, 0o600);
};
