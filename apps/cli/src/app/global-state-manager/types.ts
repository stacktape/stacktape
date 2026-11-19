import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
export type ConfigurableCliArgsDefaults = Partial<{
  [propName in keyof (typeof import('src/config/random'))['configurableGlobalDefaultCliArgs']]: string;
}>;

export type ConfigurableOtherDefaults = Partial<{
  [propName in keyof (typeof import('src/config/random'))['configurableGlobalDefaultOtherProps']]: string;
}>;

export type GlobalStateUser = CurrentUserAndOrgDataResponse['user'];
export type GlobalStateOrganization = CurrentUserAndOrgDataResponse['organization'];
export type GlobalStateConnectedAwsAccount = CurrentUserAndOrgDataResponse['connectedAwsAccounts'][number];
export type GlobalStateProject = CurrentUserAndOrgDataResponse['projects'][number];

export type PersistedState = {
  systemId: string;
  cliArgsDefaults: ConfigurableCliArgsDefaults;
  otherDefaults: ConfigurableOtherDefaults;
  authentication?: {
    /** API keys are scoped to the control-plane endpoint that issued them. */
    apiKeysByEndpoint?: Record<string, string>;
  };
  /** The one-time notice about anonymous usage telemetry was shown on this machine. */
  telemetryNoticeShown?: boolean;
};

import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';
import type { StacktapeConfig } from '@stacktape/config';

export type RunCommandOptions = {
  commands: StacktapeCommand[];
  args: StacktapeArgs;
  config?: StacktapeConfig;
  additionalArgs?: Record<string, string | boolean>;
  /** Warnings about Stacktape 3 spellings in the arguments, printed once output is configured. */
  warnings?: string[];
};
