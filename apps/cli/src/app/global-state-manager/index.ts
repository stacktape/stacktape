import { createAwsErrorHandler, createAwsLoggingPlugin } from 'src/aws/client-instrumentation';
import type {
  ConfigurableCliArgsDefaults,
  ConfigurableOtherDefaults,
  GlobalStateConnectedAwsAccount,
  GlobalStateOrganization,
  GlobalStateProject,
  GlobalStateUser,
  PersistedState,
  RunCommandOptions
} from '@application-services/global-state-manager/types';
import type { HelperLambdaDetails } from '@utils/helper-lambdas';
import type { StacktapeRecordedCommand } from '@config';
import type { LogLevel, StacktapeArgs, StacktapeCliArgs, StacktapeCommand } from 'src/config/cli/types';
import { dirname, isAbsolute, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiKeyProtectedClient } from '@stacktape-api/api-key-protected';
import { operationReporter } from '@application-services/operation-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { commandsNotRequiringApiKey } from '../../config/cli/commands';
import { getRequiredArgs } from '../../config/cli/utils';
import {
  DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_NAME,
  DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_REGION,
  RECORDED_STACKTAPE_COMMANDS
} from '@config';
import { stpErrors } from '@errors';
import type { LoadedAwsCredentials, ValidatedAwsCredentials } from 'src/aws/credentials';
import type { AwsCredentialsProvider } from 'src/aws/context';
import { SUPPORTED_AWS_REGIONS, type SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { getRoleArnFromSessionArn } from '@stacktape/naming/arns';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { propertyFromObjectOrNull } from '@utils/misc';
import { listAwsProfiles, loadAwsConfigFileContent, profileRegionFromConfig } from '@utils/aws-config';
import { loadHelperLambdaDetails } from '@utils/helper-lambdas';
import { getAwsSynchronizedTime } from '@utils/time';
import { timeAsync } from '@utils/timings';
import { generateShortUuid, generateUuid } from '@utils/uuid';
import {
  validateArgs,
  validateAwsAccountUsability,
  validateAwsProfile,
  validateCommand,
  validateCredentialsWithRespectToAccount,
  validateProjectName,
  validateStackName
} from '@utils/validator';
import { kebabCase } from 'change-case';
import dayjs from 'dayjs';
import { createProjectOrUseConcurrent } from './project-creation';
import { loadPersistedState, savePersistedState } from './utils';
import type { StacktapeConfig } from '@stacktape/config';
import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';
import { selectAwsCredentialProfile } from './credential-source';
import { loadApiKey, storeApiKey } from './credential-store';
import { consumeRunnerCredentials, rememberEnvironmentApiKey } from './runner-credentials';
import {
  configProvidedArgs,
  resolveInvocationTarget,
  resolveRegionValue,
  type InvocationTarget,
  type TargetValue
} from './invocation-target';
import {
  accountIdFromProfile,
  createProfileCredentialsProvider,
  detectLocalAwsSelectors,
  ignoredProfileNotice,
  loadProfileCredentials,
  localAwsAccountUnresolved,
  localAwsCredentialsUnavailable,
  matchConnectedAwsAccount,
  readAwsProfile,
  resolveLocalAwsAccount,
  type LocalAwsAccount
} from './local-aws-account';

const CREDENTIAL_REFRESH_LEAD_TIME_MS = 5 * 60 * 1000;
const CREDENTIAL_REFRESH_RETRY_DELAY_MS = 30 * 1000;

export class GlobalStateManager {
  isInitialized = false;
  persistedState: PersistedState;
  awsConfigFileContent: any;
  availableAwsProfiles: Awaited<ReturnType<typeof listAwsProfiles>>;
  helperLambdaDetails: HelperLambdaDetails;
  rawCommands: StacktapeCommand[];
  rawArgs: StacktapeArgs;
  /** The arguments as the user gave them, before project settings from the config were added. */
  explicitArgs: Readonly<StacktapeArgs> = {};
  /** Project and region of this invocation with where each came from. Resolved once, before arguments are validated. */
  invocationTarget?: InvocationTarget;
  presetConfig?: StacktapeConfig;
  additionalArgs: Record<string, string | boolean>;
  systemId: string;
  operationStart: Date;
  configPath: string = null;
  invocationId = process.env.STP_INVOCATION_ID || `${dayjs().format('YYYY-MM-DDTHH-mm-ss-SSS')}_${generateShortUuid()}`;
  // populated with initial dummy variables so that resource resolving can work without loaded credentials
  credentials: ValidatedAwsCredentials = {
    identity: { account: '123456789999', arn: 'arn:aws:iam::123456789999:user/dummy' }
  } as ValidatedAwsCredentials;

  credentialsRefreshTimeout?: ReturnType<typeof setTimeout>;
  private credentialRefreshGeneration = 0;
  private credentialRefreshStopped = false;
  userData?: GlobalStateUser;
  organizationData?: GlobalStateOrganization;
  connectedAwsAccounts?: GlobalStateConnectedAwsAccount[];
  localTargetAwsAccount?: GlobalStateConnectedAwsAccount;
  localCredentialsProvider?: AwsCredentialsProvider;
  /** The connected account that `--profile`, `AWS_PROFILE` or environment keys point to, when no `--awsAccount` is given. */
  awsAccountFromLocalCredentials?: { name: string; selectedBy: string };
  #localAwsAccount?: Promise<{ account?: LocalAwsAccount; error?: unknown }>;
  #localAwsAccountSelection?: Promise<void>;
  projects: GlobalStateProject[];
  permissions: string[] = [];
  isProjectScoped = false;
  /** The member reaches only the AWS accounts assigned to them, and `connectedAwsAccounts` lists only those. */
  isAwsAccountScoped = false;
  // populated with initial dummy variables so that resource resolving can work without using trpc api
  targetStack: {
    stackName: string;
    globallyUniqueStackHash: string;
    stage: string;
    projectName: string;
    projectId?: string;
  };

  apiKey: string;

  init = async (opts: RunCommandOptions) => {
    // The runner's override belongs to this invocation. Hooks and builds must not pass it to nested CLIs,
    // whose startup/exit cleanup would otherwise remove this deployment's temporary artifacts.
    delete process.env.STP_INVOCATION_ID;
    const runnerCredentials = consumeRunnerCredentials();
    clearTimeout(this.credentialsRefreshTimeout);
    this.credentialsRefreshTimeout = undefined;
    this.credentialRefreshGeneration += 1;
    this.credentialRefreshStopped = false;
    this.awsAccountFromLocalCredentials = undefined;
    this.#localAwsAccount = undefined;
    this.#localAwsAccountSelection = undefined;
    this.operationStart = new Date();
    const { commands, args, config, additionalArgs } = opts;
    this.rawCommands = commands;
    this.rawArgs = args;
    this.additionalArgs = additionalArgs || {};
    validateCommand({ rawCommands: globalStateManager.rawCommands });
    if (
      !runnerCredentials.apiKey &&
      runnerCredentials.githubActionsToken &&
      !['version', 'help', 'login', 'logout', 'upgrade', 'mcp:add', 'mcp:remove'].includes(this.command)
    ) {
      const client = new ApiKeyProtectedClient();
      await client.init({ apiKey: runnerCredentials.githubActionsToken });
      const operation = await client.exchangeGithubActionsToken({ nonce: randomUUID() });
      this.invocationId = operation.invocationId;
      runnerCredentials.apiKey = operation.apiKey;
    }
    this.persistedState = {
      systemId: null,
      cliArgsDefaults: {} as any,
      otherDefaults: {} as any
    };
    [this.persistedState, this.awsConfigFileContent, this.availableAwsProfiles, this.helperLambdaDetails] =
      await Promise.all([
        loadPersistedState(),
        loadAwsConfigFileContent(),
        listAwsProfiles(),
        loadHelperLambdaDetails({ invocationId: this.invocationId })
      ]);
    this.presetConfig = config;
    this.explicitArgs = Object.freeze({ ...this.rawArgs });

    // Resolved before the arguments are validated or captured and before credentials are chosen: all of them depend on
    // the target. Reading the config's settings is static and never runs project code.
    this.invocationTarget = await timeAsync('context:invocation-target', () =>
      resolveInvocationTarget({
        command: this.command,
        args: this.rawArgs,
        presetConfig: this.presetConfig,
        defaults: this.persistedState?.cliArgsDefaults,
        envRegion: process.env.AWS_DEFAULT_REGION,
        profileRegion: this.profileRegion,
        onIgnoredError: (error) =>
          tuiManager.debug(
            `Ignoring the project settings of the config: ${error instanceof Error ? error.message : String(error)}`
          )
      })
    );
    Object.assign(this.rawArgs, configProvidedArgs(this.invocationTarget));

    // Check if region is required but missing - we'll prompt for it in TTY mode
    const requiredArgs = getRequiredArgs(this.command);
    const commandRequiresRegion = requiredArgs?.includes('region');
    const regionIsMissing = commandRequiresRegion && !this.regionValue;
    const shouldPromptForRegion = regionIsMissing && process.stdout.isTTY;

    validateArgs({
      rawArgs: this.rawArgs,
      command: this.command,
      defaults: {
        ...this.persistedState.cliArgsDefaults,
        // The profile's region is the last fallback, after the machine-wide default, exactly as the region getter.
        region: this.persistedState.cliArgsDefaults?.region || this.profileRegion
      },
      fromEnv: {
        region: process.env.AWS_DEFAULT_REGION,
        profile: process.env.AWS_PROFILE,
        awsAccount: process.env.AWS_ACCOUNT,
        projectName: process.env.PROJECT_NAME
      },
      skipRegionValidation: shouldPromptForRegion
    });

    // Prompt for region if missing and in TTY mode
    if (shouldPromptForRegion) {
      const selectedRegion = await tuiManager.promptSelect({
        message: 'Select AWS region:',
        options: SUPPORTED_AWS_REGIONS.map((r) => ({
          label: r,
          value: r
        })),
        defaultValue: 'us-east-1'
      });
      this.rawArgs.region = selectedRegion as AWSRegion;
    }

    // persisted system ID can also be loaded from env variable. This is necessary when using remote deploy runners.
    const persistedSystemId = this.persistedState?.systemId || process.env.STP_ORIGINAL_SYSTEM_ID;
    this.systemId = persistedSystemId || generateUuid();
    if (!persistedSystemId) {
      await this.saveSystemId();
    }
    rememberEnvironmentApiKey(runnerCredentials.apiKey);
    this.apiKey = runnerCredentials.apiKey || (await this.loadStoredApiKey());
    if (!this.apiKey && !commandsNotRequiringApiKey.includes(this.command)) {
      if (process.stdout.isTTY) {
        // Interactive sign-in: the browser (device code) or a pasted API key.
        const { runAuthFlow } = await import('../../commands/_utils/auth');
        const authResult = await runAuthFlow({ command: this.command });
        if (!authResult.success || !authResult.apiKey) {
          throw stpErrors.e501({ operation: this.command });
        }
        this.apiKey = authResult.apiKey;
        await this.saveApiKey({ apiKey: authResult.apiKey });
      } else {
        throw stpErrors.e501({ operation: this.command });
      }
    }
    this.isInitialized = true;
  };

  get args(): StacktapeArgs {
    if (!this.rawArgs) {
      return {};
    }
    return this.rawArgs;
  }

  get command(): StacktapeCommand {
    if (!this.rawArgs) {
      return null;
    }
    return this.rawCommands[0];
  }

  get workingDir() {
    const currentWorkingDirectory = this.args.currentWorkingDirectory;
    if (currentWorkingDirectory) {
      return isAbsolute(currentWorkingDirectory)
        ? currentWorkingDirectory
        : join(process.cwd(), currentWorkingDirectory);
    }
    if (this.configPath) {
      return dirname(this.configPath);
    }
    return process.cwd();
  }

  get isDebugMode() {
    return process.env.STP_DEBUG === 'true' || this.logLevel === 'debug';
  }

  get logLevel(): LogLevel {
    return propertyFromObjectOrNull(this.args, 'logLevel') || 'info';
  }

  get stage() {
    const stage = this.args.stage || this.persistedState?.cliArgsDefaults.stage;
    return stage;
  }

  get awsProfileName() {
    return this.rawArgs.profile || process.env.AWS_PROFILE || this.persistedState?.cliArgsDefaults.profile || 'default';
  }

  /** Region of the selected AWS profile in the AWS config file. */
  get profileRegion(): string | undefined {
    if (!this.awsConfigFileContent) return undefined;
    return profileRegionFromConfig(this.awsConfigFileContent, this.awsProfileName);
  }

  /**
   * The effective region with its source. Arguments already contain a config-declared region, so the order is: flag,
   * project config, `AWS_DEFAULT_REGION`, machine-wide default, AWS profile.
   */
  get regionValue(): TargetValue | undefined {
    const resolved = this.invocationTarget?.region;
    if (this.args.region && resolved?.source === 'config' && resolved.value === this.args.region) return resolved;
    return resolveRegionValue({
      flag: this.args.region,
      envRegion: process.env.AWS_DEFAULT_REGION,
      defaultRegion: this.persistedState?.cliArgsDefaults.region,
      profileRegion: this.profileRegion
    });
  }

  get region() {
    return this.regionValue?.value as AWSRegion;
  }

  get cloudformationRegistryBucketName() {
    return process.env.STP_CF_PRIVATE_TYPES_BUCKET_NAME || DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_NAME;
  }

  get cloudformationRegistryBucketRegion(): AWSRegion {
    return (
      (process.env.STP_CF_PRIVATE_TYPES_BUCKET_REGION as AWSRegion) || DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_REGION
    );
  }

  get targetAwsAccount(): GlobalStateConnectedAwsAccount {
    if (this.localTargetAwsAccount) {
      return this.localTargetAwsAccount;
    }
    if (this.localCredentialsProvider) {
      throw new Error('The AWS account of the local credentials was read before resolveLocalAwsAccount looked it up.');
    }
    const awsAccount =
      this.args.awsAccount ||
      this.awsAccountFromLocalCredentials?.name ||
      this.persistedState?.cliArgsDefaults.awsAccount;
    if (awsAccount) {
      const account = this.connectedAwsAccounts?.find(({ name }) => name === awsAccount);
      if (!account) {
        throw stpErrors.e65({
          accountName: awsAccount,
          organizationName: this.organizationData.name,
          connectedAwsAccounts: this.connectedAwsAccounts,
          isAwsAccountScoped: this.isAwsAccountScoped
        });
      }
      return account;
    }
    if (this.connectedAwsAccounts.length < 1) {
      throw stpErrors.e66({
        organizationName: this.organizationData.name,
        isAwsAccountScoped: this.isAwsAccountScoped
      });
    }
    if (this.connectedAwsAccounts.length > 1) {
      throw stpErrors.e67({
        organizationName: this.organizationData.name,
        connectedAwsAccounts: this.connectedAwsAccounts
      });
    }
    return this.connectedAwsAccounts[0];
  }

  reloadPersistedState = async () => {
    this.persistedState = await loadPersistedState();
  };

  saveDefaults = async ({
    cliArgsDefaults,
    otherDefaults
  }: {
    cliArgsDefaults: ConfigurableCliArgsDefaults;
    otherDefaults: ConfigurableOtherDefaults;
  }) => {
    this.persistedState.cliArgsDefaults = cliArgsDefaults;
    this.persistedState.otherDefaults = otherDefaults;
    return savePersistedState(this.persistedState);
  };

  /** The API key `stacktape login` stored on this machine, never one passed through the environment. */
  loadStoredApiKey = async () => {
    const { apiKey, persistedState } = await loadApiKey({ persistedState: this.persistedState });
    if (persistedState !== this.persistedState) {
      this.persistedState = persistedState;
      await savePersistedState(this.persistedState);
    }
    return apiKey;
  };

  saveApiKey = async ({ apiKey }: { apiKey: string | null }) => {
    this.persistedState = await storeApiKey({ persistedState: this.persistedState, apiKey });
    return savePersistedState(this.persistedState);
  };

  loadUserCredentials = async () => {
    // Only load user data if not already loaded (ensureAwsAccountConnected may have done this)
    if (!this.userData || !this.organizationData) {
      await stacktapeTrpcApiManager.init({ apiKey: this.apiKey });
      await this.loadUserDataFromTrpcApi();
    }
    await this.selectAwsAccountFromLocalCredentials();
    await this.loadValidatedAwsCredentials();
  };

  get localAwsSelectors() {
    return detectLocalAwsSelectors({ requestedProfile: this.rawArgs?.profile, environment: process.env });
  }

  /**
   * The AWS account ID of the local credentials, without the Console: from the profile when it names its account,
   * otherwise one STS call. Undefined with `--awsAccount`, without a profile or credential variables, or when it cannot
   * be found.
   */
  resolveLocalAwsAccountId = async (): Promise<string | undefined> => {
    if (this.args.awsAccount) return undefined;
    this.startLocalAwsAccountResolution();
    return (await this.#localAwsAccount)?.account?.accountId;
  };

  /** Starts finding the account of local AWS credentials, so its STS call can overlap the Console request. */
  startLocalAwsAccountResolution = () => {
    if (this.args.awsAccount || this.#localAwsAccount) return;
    const environment = process.env;
    const callerAccount = async (credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    }) => {
      const { getAwsCredentialsIdentity } = await import('src/aws/identity');
      const identity = await getAwsCredentialsIdentity({
        credentials,
        region: this.region || 'us-east-1',
        getErrorHandler: () => (error) => {
          throw error;
        },
        loggingPlugin: createAwsLoggingPlugin({ printer: tuiManager, isDebug: () => this.logLevel === 'debug' })
      });
      if (!identity.Account) throw new Error('AWS STS returned no account ID');
      return identity.Account;
    };
    this.#localAwsAccount = resolveLocalAwsAccount({
      selectors: this.localAwsSelectors,
      sources: {
        readProfile: (profile) => readAwsProfile(profile, environment),
        profileCallerAccount: async (profile) => {
          const { assumedRoleIdentityPlugin } = await import('src/aws/identity');
          return callerAccount(
            await loadProfileCredentials({
              profile,
              environment,
              region: this.region,
              clientPlugins: [assumedRoleIdentityPlugin]
            })
          );
        },
        // The keys themselves, not a provider chain: nothing else can stand in for them when they are rejected.
        environmentCallerAccount: () => {
          if (!environment.AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY is not set');
          return callerAccount({
            accessKeyId: environment.AWS_ACCESS_KEY_ID!,
            secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
            sessionToken: environment.AWS_SESSION_TOKEN
          });
        }
      }
    }).then(
      (account) => ({ account }),
      (error) => ({ error })
    );
  };

  /**
   * Without `--awsAccount`, local AWS credentials choose the connected account, ahead of the saved default. With it,
   * a selected profile that will not supply the credentials gets one line saying so. Runs once, after the connected
   * accounts are loaded.
   */
  selectAwsAccountFromLocalCredentials = () => {
    this.#localAwsAccountSelection ??= (async () => {
      if (this.args.awsAccount) {
        const notice = ignoredProfileNotice({ selectors: this.localAwsSelectors, account: this.targetAwsAccount });
        if (notice) tuiManager.info(notice);
        return;
      }
      this.startLocalAwsAccountResolution();
      const { account, error } = await this.#localAwsAccount!;
      if (error) throw error;
      if (!account) return;
      const connected = matchConnectedAwsAccount({
        localAccount: account,
        connectedAwsAccounts: this.connectedAwsAccounts,
        organizationName: this.organizationData.name
      });
      this.awsAccountFromLocalCredentials = { name: connected.name, selectedBy: account.selector.label };
    })();
    return this.#localAwsAccountSelection;
  };

  /**
   * Local AWS credentials for `package`, which builds artifacts on this machine and usually never calls AWS. Nothing is
   * requested here: the provider runs when an AWS client first signs a request, and the account is looked up by
   * `resolveLocalAwsAccount` only when something needs it. A profile that names its account (an assumed role, SSO or
   * web identity) supplies it without a request, and then only that profile supplies the credentials: the default chain
   * would fall through to container, instance or environment credentials of another account when the profile fails.
   */
  prepareLocalAwsCredentials = async (): Promise<AwsCredentialsProvider> => {
    const selectedProfile = selectAwsCredentialProfile({
      requestedProfile: this.rawArgs.profile,
      environmentProfile: process.env.AWS_PROFILE,
      persistedProfile: this.persistedState?.cliArgsDefaults.profile,
      environment: process.env
    });
    const accountId = selectedProfile
      ? accountIdFromProfile(await readAwsProfile(selectedProfile, process.env))
      : undefined;
    // Imported on use, like every AWS SDK module here, so commands that never use AWS do not evaluate the SDK.
    const loadProvider = async (): Promise<AwsCredentialsProvider> => {
      const { assumedRoleIdentityPlugin } = await import('src/aws/identity');
      if (selectedProfile && accountId) {
        return createProfileCredentialsProvider({
          profile: selectedProfile,
          region: this.region,
          clientPlugins: [assumedRoleIdentityPlugin]
        });
      }
      const { defaultProvider } = await import('@aws-sdk/credential-provider-node');
      return defaultProvider({
        ...(selectedProfile ? { profile: selectedProfile } : {}),
        clientPlugins: [assumedRoleIdentityPlugin]
      });
    };
    let provider: Promise<AwsCredentialsProvider> | undefined;
    const credentialsProvider: AwsCredentialsProvider = async () => {
      provider ??= loadProvider();
      try {
        return await (
          await provider
        )();
      } catch (cause) {
        throw localAwsCredentialsUnavailable({ profile: selectedProfile, cause });
      }
    };
    this.localCredentialsProvider = credentialsProvider;
    this.#localCredentialProfile = selectedProfile;
    if (accountId) {
      this.localTargetAwsAccount = this.#localTargetAccount(accountId);
    }
    return credentialsProvider;
  };

  /**
   * The account of the local credentials prepared by `prepareLocalAwsCredentials`, looked up with STS the first time
   * something needs it. Does nothing when the account is already known.
   */
  resolveLocalAwsAccount = async () => {
    if (this.localTargetAwsAccount || !this.localCredentialsProvider) return;
    this.#localAwsAccountLookup ??= this.#lookUpLocalAwsAccount();
    return this.#localAwsAccountLookup;
  };

  #localCredentialProfile?: string;
  #localAwsAccountLookup?: Promise<void>;

  #localTargetAccount = (awsAccountId: string): GlobalStateConnectedAwsAccount => ({
    id: `local:${awsAccountId}`,
    organizationId: 'local',
    awsAccountId,
    connectionMode: 'BASIC',
    name: this.#localCredentialProfile || 'local credential chain',
    state: 'ACTIVE',
    primaryRegions: [this.region],
    defaultRegion: this.region
  });

  #lookUpLocalAwsAccount = async () => {
    await operationReporter.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });
    const { getAwsCredentialsIdentity } = await import('src/aws/identity');
    const profile = this.#localCredentialProfile;
    const credentials = await timeAsync('credentials:provider-chain', async () => this.localCredentialsProvider());
    const { account, arn } = await getAwsCredentialsIdentity({
      credentials,
      region: this.region,
      getErrorHandler: createAwsErrorHandler({
        credentials: () => this.credentials,
        profile: () => this.awsProfileName
      }),
      loggingPlugin: createAwsLoggingPlugin({ printer: tuiManager, isDebug: () => this.logLevel === 'debug' })
    }).then(
      ({ Account, Arn }) => {
        if (!Account || !Arn) throw new Error('AWS STS returned an incomplete caller identity.');
        return { account: Account, arn: Arn };
      },
      (cause) => {
        throw localAwsAccountUnresolved({ profile, cause });
      }
    );
    this.credentials = { ...credentials, source: 'providerChain', identity: { account, arn } };
    this.localTargetAwsAccount = this.#localTargetAccount(account);
    await operationReporter.finishEvent({
      eventType: 'LOAD_AWS_CREDENTIALS',
      finalMessage: profile
        ? `AWS credentials loaded (profile ${profile})`
        : 'AWS credentials loaded (standard AWS credential chain)'
    });
  };

  loadUserDataFromTrpcApi = async () => {
    this.setCurrentUserAndOrgData(await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData());
  };

  setCurrentUserAndOrgData = (data: CurrentUserAndOrgDataResponse) => {
    this.userData = data.user;
    this.organizationData = data.organization;
    this.connectedAwsAccounts = data.connectedAwsAccounts;
    this.projects = data.projects;
    this.permissions = data.permissions;
    this.isProjectScoped = data.isProjectScoped;
    this.isAwsAccountScoped = data.isAwsAccountScoped ?? false;
  };

  loadValidatedAwsCredentials = async (): Promise<ValidatedAwsCredentials> => {
    await operationReporter.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });
    validateAwsAccountUsability({ account: this.targetAwsAccount, organization: this.organizationData });

    // loading method API
    const loadCredentialsUsingApi = async (): Promise<LoadedAwsCredentials> => {
      const { credentials } = await timeAsync('credentials:console', () =>
        stacktapeTrpcApiManager.apiClient.awsAccountCredentials({ awsAccountName: this.targetAwsAccount.name })
      );
      return { ...credentials, expiration: new Date(credentials.expiration), source: 'api' } as LoadedAwsCredentials;
    };

    // loading method ENV
    const loadCredentialsUsingEnv = (): LoadedAwsCredentials => {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
        expiration: process.env.EXPIRATION && new Date(process.env.EXPIRATION),
        source: 'envVar'
      };
    };

    // loading method re-ASSUME ROLE
    const loadCredentialsUsingReAssumeRole = async (): Promise<LoadedAwsCredentials> => {
      const { awsSdkManager } = await import('@utils/aws-sdk-manager');
      const credentials = await awsSdkManager.sts.assumeRoleCredentials({
        roleArn: getRoleArnFromSessionArn(this.credentials.identity.arn),
        roleSessionName: `stp-user-session_${this.userData.id}`
      });
      return {
        ...credentials,
        expiration: new Date(credentials.expiration),
        source: 'assumeRole'
      };
    };

    // loading method credentials FILE
    const loadCredentialsUsingCredentialsFile = (): LoadedAwsCredentials => {
      validateAwsProfile({ availableAwsProfiles: this.availableAwsProfiles, profile: this.awsProfileName });
      const profile = this.availableAwsProfiles.find((p) => p.profile === this.awsProfileName);
      return {
        accessKeyId: profile.AWS_ACCESS_KEY_ID,
        secretAccessKey: profile.AWS_SECRET_ACCESS_KEY,
        source: 'credentialsFile'
      };
    };

    let creds: LoadedAwsCredentials;
    const credentialsAlreadySet = this.credentials?.source;
    if (credentialsAlreadySet) {
      switch (this.credentials.source) {
        case 'api':
          creds = await loadCredentialsUsingApi();
          break;
        case 'assumeRole':
          creds = await loadCredentialsUsingReAssumeRole();
          break;
        case 'envVar':
          // Expiring environment credentials are produced by remote runners from a self-assumable role.
          creds = this.credentials.expiration ? await loadCredentialsUsingReAssumeRole() : loadCredentialsUsingEnv();
          break;
        case 'credentialsFile':
          creds = loadCredentialsUsingCredentialsFile();
          break;
        case 'providerChain':
          creds = {
            ...(await this.localCredentialsProvider()),
            source: 'providerChain'
          };
          break;
      }
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      creds = loadCredentialsUsingEnv();
    } else if (this.targetAwsAccount.connectionMode === 'PRIVILEGED') {
      creds = await loadCredentialsUsingApi();
    } else {
      creds = loadCredentialsUsingCredentialsFile();
    }

    const validatedCredentials = await validateCredentialsWithRespectToAccount({
      credentials: creds,
      identityContext: {
        region: this.region,
        getErrorHandler: createAwsErrorHandler({
          credentials: () => this.credentials,
          profile: () => this.awsProfileName
        }),
        loggingPlugin: createAwsLoggingPlugin({ printer: tuiManager, isDebug: () => this.logLevel === 'debug' })
      },
      targetAccount: this.targetAwsAccount,
      profile: this.awsProfileName
    });

    this.credentials = validatedCredentials;

    // Expiring credentials are refreshed shortly before they expire. Scheduling reads AWS's clock over HTTP, which the
    // command does not wait for: the credentials are valid for far longer than that takes.
    if (this.credentials.expiration) {
      void this.scheduleCredentialRefresh(this.credentials.expiration);
    }
    // The finished line must stand alone in the record — name the subject, not
    // just the source ("Loaded from Stacktape API" reads as a mystery later).
    const loadedFrom = {
      envVar: 'from environment variables',
      credentialsFile: 'from credentials file',
      providerChain: 'from AWS credential provider chain',
      api: 'via Stacktape',
      assumeRole: 'from assumed role'
    }[this.credentials.source];
    // Names the target before anything changes, so a wrong account is visible in the first lines of every run.
    const { name, awsAccountId } = this.targetAwsAccount;
    const selectedBy = this.awsAccountFromLocalCredentials?.selectedBy;
    await operationReporter.finishEvent({
      eventType: 'LOAD_AWS_CREDENTIALS',
      finalMessage: `AWS credentials loaded ${loadedFrom} for account ${name} (${awsAccountId})${
        selectedBy ? `, selected by ${selectedBy}` : ''
      }`
    });
    return this.credentials;
  };

  protected scheduleCredentialRefresh = async (credentialsExpiration: Date) => {
    const generation = ++this.credentialRefreshGeneration;

    const msUntilExpiration = new Date(credentialsExpiration).getTime() - (await getAwsSynchronizedTime()).getTime();
    if (this.credentialRefreshStopped || generation !== this.credentialRefreshGeneration) return;

    clearTimeout(this.credentialsRefreshTimeout);
    const refreshDelay = Math.max(msUntilExpiration - CREDENTIAL_REFRESH_LEAD_TIME_MS, 0);
    this.credentialsRefreshTimeout = setTimeout(() => {
      void this.refreshCredentialsAfterTimeout(generation);
    }, refreshDelay);
  };

  protected refreshCredentialsAfterTimeout = async (generation = this.credentialRefreshGeneration) => {
    if (this.credentialRefreshStopped || generation !== this.credentialRefreshGeneration) return;
    this.credentialsRefreshTimeout = undefined;

    try {
      await this.loadValidatedAwsCredentials();
    } catch {
      if (this.credentialRefreshStopped || generation !== this.credentialRefreshGeneration) return;
      clearTimeout(this.credentialsRefreshTimeout);
      this.credentialsRefreshTimeout = undefined;
      await Promise.resolve(
        operationReporter.finishEvent({
          eventType: 'LOAD_AWS_CREDENTIALS',
          finalMessage: 'Automatic AWS credential refresh failed.'
        })
      ).catch(() => undefined);
      if (this.credentialRefreshStopped || generation !== this.credentialRefreshGeneration) return;

      tuiManager.warn('Automatic AWS credential refresh failed. Retrying in 30 seconds.');
      this.credentialsRefreshTimeout = setTimeout(() => {
        void this.refreshCredentialsAfterTimeout(generation);
      }, CREDENTIAL_REFRESH_RETRY_DELAY_MS);
    }
  };

  stopCredentialRefresh = () => {
    this.credentialRefreshStopped = true;
    this.credentialRefreshGeneration += 1;
    clearTimeout(this.credentialsRefreshTimeout);
    this.credentialsRefreshTimeout = undefined;
  };

  getStackOperationLogStreamName = ({ stackName }: { stackName: string }) => {
    if (RECORDED_STACKTAPE_COMMANDS.includes(this.command as StacktapeRecordedCommand)) {
      return `${stackName}/${kebabCase(this.command)}/${this.invocationId}`;
    }
  };

  saveSystemId = async () => {
    this.persistedState.systemId = this.systemId;
    return savePersistedState(this.persistedState);
  };

  setConfigPath = (configPath: string) => {
    this.configPath = configPath;
  };

  loadTargetStackInfo = async ({ configProjectName }: { configProjectName?: string } = {}) => {
    // await operationReporter.startEvent({
    //   eventType: 'LOAD_TARGET_STACK_INFO',
    //   description: 'Loading target stack info'
    // });
    // The stage first: a project created below must fit the stack name together with it.
    const stage = await this.#resolveStage();
    const { id: projectId, name: projectName } = await this.#resolveTargetProject({ configProjectName, stage });
    const stackName = validateStackName({ projectName, stage });
    const globallyUniqueStackHash = getGloballyUniqueStackHash({
      region: this.region,
      accountId: this.targetAwsAccount.awsAccountId,
      stackName
    });
    this.targetStack = {
      projectName,
      projectId,
      stackName,
      stage,
      globallyUniqueStackHash
    };
    // await operationReporter.finishEvent({
    //   eventType: 'LOAD_TARGET_STACK_INFO'
    // });
  };

  loadLocalTargetStackInfo = async ({ configProjectName }: { configProjectName?: string } = {}) => {
    let projectName = this.args.projectName || this.persistedState?.cliArgsDefaults.projectName || configProjectName;
    if (!projectName) {
      if (!process.stdout.isTTY) {
        throw stpErrors.e103(null);
      }
      projectName = await tuiManager.promptText({
        message: `Enter the project name (you can save it in config as ${tuiManager.prettyConfigProperty(
          'projectName'
        )})`
      });
    }
    validateProjectName(projectName);

    const stage = await this.#resolveStage();
    const stackName = validateStackName({ projectName, stage });
    const { region } = this;
    const accountId = () => this.targetAwsAccount.awsAccountId;
    this.targetStack = {
      projectName,
      stackName,
      stage,
      // Read only when used: the account of local credentials is looked up only when something needs it.
      get globallyUniqueStackHash() {
        return getGloballyUniqueStackHash({ region, accountId: accountId(), stackName });
      }
    };
  };

  #resolveStage = async () => {
    let stage = this.args.stage || this.persistedState?.cliArgsDefaults.stage;
    if (!stage) {
      stage = await tuiManager.promptText({
        message: 'Enter stage (environment) for the operation (i.e production, test or staging)',
        placeholder: 'test'
      });
    }
    return stage;
  };

  #resolveTargetProject = async ({ configProjectName, stage }: { configProjectName?: string; stage: string }) => {
    const createNewProject = async (projectName?: string) => {
      let chosenProjectName = projectName;
      if (!chosenProjectName) {
        chosenProjectName = await tuiManager.promptText({
          message: 'Enter name for your project (i.e "my-todo-app"). Use only letters, numbers and dashes.'
        });
      }
      validateProjectName(chosenProjectName);
      validateStackName({ projectName: chosenProjectName, stage });
      return createProjectOrUseConcurrent({
        name: chosenProjectName,
        organizationId: this.organizationData?.id,
        create: () =>
          stacktapeTrpcApiManager.apiClient.createProject({
            name: chosenProjectName,
            configPath: this.args.configPath,
            region: this.region
          }),
        readProjects: async () => {
          const data = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
          if (data.organization.id === this.organizationData?.id) this.projects = data.projects;
          return { organizationId: data.organization.id, projects: data.projects };
        }
      });
    };

    const chooseExistingProject = async () => {
      const existingProjectName = await tuiManager.promptSelect({
        message: 'Select existing project',
        options: this.projects
          .sort((p1, p2) => p1.name.localeCompare(p2.name))
          .map(({ name }) => ({ label: name, value: name }))
      });
      return this.projects.find(({ name }) => name === existingProjectName);
    };
    const projectName = this.args.projectName || this.persistedState?.cliArgsDefaults.projectName || configProjectName;
    if (!projectName) {
      if ((this.args as StacktapeCliArgs).autoConfirmOperation || !process.stdout.isTTY) {
        throw stpErrors.e103(null);
      }
      if (this.projects.length) {
        const newOrExisting = await tuiManager.promptSelect({
          message: `Which project do you want to use? (You can also specify it using ${tuiManager.prettyOption('projectName')}).`,
          options: [
            { label: 'Create new project', value: 'new' },
            { label: 'Choose existing project', value: 'existing' }
          ]
        });
        if (newOrExisting === 'existing') {
          return chooseExistingProject();
        }
      }

      return createNewProject();
    }
    const userSpecifiedExistingProject = this.projects.find(({ name }) => name === projectName);
    // if user specified existing project, return it
    if (userSpecifiedExistingProject) {
      return userSpecifiedExistingProject;
    }

    // Arguments carry a config-declared name too, so the resolved target, not the argument, tells where it came from.
    const projectNameComesFromConfig =
      this.invocationTarget?.projectName?.source === 'config' || projectName === configProjectName;

    // A project declared in config is intentional, so it can be created without a second confirmation.
    if (!this.projects?.length || (this.args as StacktapeCliArgs).autoConfirmOperation || projectNameComesFromConfig) {
      return createNewProject(projectName);
    }

    // if we got this far and this is not TTY, throw error
    if (process.env.CI || !process.stdout.isTTY) {
      throw stpErrors.e103({ missingProjectName: projectName });
    }

    // An explicit CLI value may be a typo, so confirm before creating it.
    if (!projectNameComesFromConfig) {
      const newOrExisting = await tuiManager.promptSelect({
        message: `Project with name ${tuiManager.colorize('gray', projectName)} does not exist.`,
        options: [
          { label: `Create project with name ${tuiManager.colorize('gray', `"${projectName}"`)}.`, value: 'new' },
          { label: 'Choose existing project', value: 'existing' }
        ]
      });

      if (newOrExisting === 'existing') {
        return chooseExistingProject();
      }
    }
    return createNewProject(projectName);
  };
}

export const globalStateManager = new GlobalStateManager();
