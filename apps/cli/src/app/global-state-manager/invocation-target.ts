/**
 * The project and region one CLI invocation targets, resolved once before arguments are validated and credentials are
 * chosen. Everything that needs the target (validation, credentials, AWS clients, headers, operation recording,
 * `status`, dev agent locks, authoring parameters, project creation) reads it from here or from the arguments this
 * resolution fills in.
 *
 * Precedence: a CLI flag, then the project config's settings, then the sources the CLI used before configs could
 * declare them, in their existing order (`AWS_DEFAULT_REGION`, the machine-wide default, the AWS profile's region).
 * Outside a project, or for a command that does not take the settings, the result is exactly what it was before.
 */
import { existsSync } from 'node:fs';
import type { StacktapeConfig } from '@stacktape/config';
import type { StacktapeCommand } from '../../config/cli/commands';
import {
  locateConfigFile,
  projectSettingsErrorsAreFatal,
  projectSettingsForCommand,
  projectSettingsFromConfigObject,
  readProjectSettingsFile,
  type ProjectSettingName,
  type ProjectSettings
} from '@domain-services/config-manager/project-settings';

export type TargetValueSource = 'flag' | 'config' | 'env' | 'default' | 'profile';
export type TargetValue = Readonly<{ value: string; source: TargetValueSource }>;

export type InvocationTarget = Readonly<{
  projectName?: TargetValue;
  region?: TargetValue;
  /** Config file whose settings were read; absent when no settings were consulted. */
  configPath?: string;
  /** Settings read statically from the config, or undefined when they were not read. */
  settings?: ProjectSettings;
  /** Settings this command takes from the config, values present or not. */
  appliedSettings: readonly ProjectSettingName[];
}>;

type TargetInputs = {
  command: StacktapeCommand;
  args: Readonly<{ projectName?: string; region?: string; configPath?: string; currentWorkingDirectory?: string }>;
  presetConfig?: StacktapeConfig;
  defaults?: Readonly<{ projectName?: string; region?: string }>;
  envRegion?: string;
  profileRegion?: string;
  cwd?: string;
  /** Called when a command continues without settings because its config cannot be read. */
  onIgnoredError?: (error: unknown) => void;
};

const readSettings = async ({
  command,
  args,
  presetConfig,
  cwd,
  onIgnoredError
}: TargetInputs): Promise<{ configPath?: string; settings?: ProjectSettings }> => {
  // A config passed to the programmatic API replaces the file, so its own values are the settings.
  if (presetConfig) return { settings: projectSettingsFromConfigObject(presetConfig, 'the provided configuration') };
  try {
    const { path } = locateConfigFile({
      configPath: args.configPath,
      currentWorkingDirectory: args.currentWorkingDirectory,
      cwd
    });
    // A missing `--config` file is reported where the config is loaded, with the error that names it.
    if (!path || !existsSync(path)) return {};
    return { configPath: path, settings: await readProjectSettingsFile(path) };
  } catch (error) {
    if (projectSettingsErrorsAreFatal(command)) throw error;
    onIgnoredError?.(error);
    return {};
  }
};

export const resolveRegionValue = ({
  flag,
  config,
  envRegion,
  defaultRegion,
  profileRegion
}: {
  flag?: string;
  config?: string;
  envRegion?: string;
  defaultRegion?: string;
  profileRegion?: string;
}): TargetValue | undefined => {
  if (flag) return { value: flag, source: 'flag' };
  if (config) return { value: config, source: 'config' };
  if (envRegion) return { value: envRegion, source: 'env' };
  if (defaultRegion) return { value: defaultRegion, source: 'default' };
  if (profileRegion) return { value: profileRegion, source: 'profile' };
  return undefined;
};

export const resolveInvocationTarget = async (inputs: TargetInputs): Promise<InvocationTarget> => {
  const { command, args, defaults, envRegion, profileRegion } = inputs;
  const appliedSettings = projectSettingsForCommand(command);
  const { configPath, settings } = appliedSettings.length ? await readSettings(inputs) : {};
  const fromConfig = (name: ProjectSettingName) => (appliedSettings.includes(name) ? settings?.[name] : undefined);

  const projectFromConfig = fromConfig('projectName');
  const projectName: TargetValue | undefined = args.projectName
    ? { value: args.projectName, source: 'flag' }
    : projectFromConfig
      ? { value: projectFromConfig, source: 'config' }
      : defaults?.projectName
        ? { value: defaults.projectName, source: 'default' }
        : undefined;
  const region = resolveRegionValue({
    flag: args.region,
    config: fromConfig('region'),
    envRegion,
    defaultRegion: defaults?.region,
    profileRegion
  });
  return Object.freeze({
    ...(projectName ? { projectName } : {}),
    ...(region ? { region } : {}),
    ...(configPath ? { configPath } : {}),
    ...(settings ? { settings } : {}),
    appliedSettings
  });
};

/** The config-declared values to place among the command's arguments, so every consumer of the arguments sees them. */
export const configProvidedArgs = (target: InvocationTarget): Partial<Record<ProjectSettingName, string>> =>
  Object.fromEntries(
    (['projectName', 'region'] as const)
      .filter((name) => target[name]?.source === 'config' && target.appliedSettings.includes(name))
      .map((name) => [name, target[name]!.value])
  );
