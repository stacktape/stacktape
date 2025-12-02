import os from 'node:os';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '@config';
import { fsPaths } from '@shared/naming/fs-paths';
import { upsertUserToMixpanel } from '@shared/utils/telemetry';
import { ensureDir, outputJson, readJson } from 'fs-extra';

export const loadPersistedState = async (): Promise<PersistedState> => {
  try {
    const res = await readJson(fsPaths.persistedStateFilePath());
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
    await ensureDir(fsPaths.stacktapeDataFolder());
    isStacktapeDataDirAvailable = true;
  }
  return outputJson(fsPaths.persistedStateFilePath(), persistedState);
};

export const createTemporaryMixpanelUser = (systemId: string) => {
  return upsertUserToMixpanel(systemId, {
    $name: os.hostname(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
};
