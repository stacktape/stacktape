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
};

import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';
import type { StacktapeConfig } from '@stacktape/config';

export type StacktapeProgrammaticOptions = {
  commands: StacktapeCommand[];
  args: StacktapeArgs;
  config?: StacktapeConfig;
  invokedFrom: InvokedFrom;
  additionalArgs?: Record<string, string | boolean>;
};

export type InvokedFrom = 'cli' | 'server';
