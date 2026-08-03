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
import { eventManager } from '@application-services/event-manager';
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
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SUPPORTED_AWS_REGIONS, type SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { getRoleArnFromSessionArn } from '@stacktape/naming/arns';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { propertyFromObjectOrNull } from '@utils/misc';
import { listAwsProfiles, loadAwsConfigFileContent } from '@utils/aws-config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getAwsCredentialsIdentity } from '@utils/aws-sdk-manager/utils';
import { loadHelperLambdaDetails } from '@utils/helper-lambdas';
import { getAwsSynchronizedTime } from '@utils/time';
import { generateShortUuid, generateUuid } from '@utils/uuid';
import {
  validateArgs,
  validateAwsAccountUsability,
  validateAwsProfile,
  validateCommand,
  validateCredentialsWithRespectToAccount,
  validateProjectName
} from '@utils/validator';
import { kebabCase } from 'change-case';
import dayjs from 'dayjs';
import { loadPersistedState, savePersistedState } from './utils';
import { runAuthFlow } from '../../commands/_utils/auth';
import type { StacktapeConfig } from '@stacktape/config';
import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';

const CREDENTIAL_REFRESH_LEAD_TIME_MS = 5 * 60 * 1000;
const CREDENTIAL_REFRESH_RETRY_DELAY_MS = 30 * 1000;

export type DomainServiceName =
  | 'ConfigManager'
  | 'DeploymentArtifactManager'
  | 'DomainManager'
  | 'PackagingManager'
  | 'StackManager'
  | 'TemplateManager'
  | 'DeployedStackOverviewManager'
  | 'CalculatedStackOverviewManager'
  | 'BudgetManager'
  | 'CloudformationRegistryManager'
  | 'SesManager'
  | 'ThirdPartyProviderManager';

export class GlobalStateManager {
  isInitialized = false;
  persistedState: PersistedState;
  awsConfigFileContent: any;
  availableAwsProfiles: Awaited<ReturnType<typeof listAwsProfiles>>;
  helperLambdaDetails: HelperLambdaDetails;
  rawCommands: StacktapeCommand[];
  rawArgs: StacktapeArgs;
  presetConfig?: StacktapeConfig;
  initializedDomainServices: DomainServiceName[] = [];
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
  projects: GlobalStateProject[];
  permissions: string[] = [];
  isProjectScoped = false;
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
    clearTimeout(this.credentialsRefreshTimeout);
    this.credentialsRefreshTimeout = undefined;
    this.credentialRefreshGeneration += 1;
    this.credentialRefreshStopped = false;
    this.operationStart = new Date();
    const { commands, args, config, additionalArgs } = opts;
    this.rawCommands = commands;
    this.rawArgs = args;
    this.additionalArgs = additionalArgs || {};
    validateCommand({ rawCommands: globalStateManager.rawCommands });
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
    if (config) {
      this.presetConfig = config;
    }

    // Check if region is required but missing - we'll prompt for it in TTY mode
    const requiredArgs = getRequiredArgs(this.command);
    const commandRequiresRegion = requiredArgs?.includes('region');
    const regionFromArgs =
      this.rawArgs.region ||
      process.env.AWS_DEFAULT_REGION ||
      this.persistedState?.cliArgsDefaults?.region ||
      this.awsConfigFileContent?.[this.rawArgs.profile || process.env.AWS_PROFILE || 'default']?.region;
    const regionIsMissing = commandRequiresRegion && !regionFromArgs;
    const shouldPromptForRegion = regionIsMissing && process.stdout.isTTY;

    validateArgs({
      rawArgs: this.rawArgs,
      command: this.command,
      defaults: this.persistedState.cliArgsDefaults,
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
    this.apiKey = process.env.STACKTAPE_API_KEY || this.persistedState?.otherDefaults?.apiKey;
    if (!this.apiKey && !commandsNotRequiringApiKey.includes(this.command)) {
      if (process.stdout.isTTY) {
        // Run interactive auth flow (sign up, login, or Google OAuth)
        const authResult = await runAuthFlow();
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

  get region() {
    const region =
      this.args.region ||
      process.env.AWS_DEFAULT_REGION ||
      this.persistedState?.cliArgsDefaults.region ||
      this.awsConfigFileContent?.[this.awsProfileName]?.region;
    return region as AWSRegion;
  }

  get cloudformationRegistryBucketName() {
    return process.env.STP_CF_PRIVATE_TYPES_BUCKET_NAME || DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_NAME;
  }

  get cloudformationRegistryBucketRegion(): AWSRegion {
    return (
      (process.env.STP_CF_PRIVATE_TYPES_BUCKET_REGION as AWSRegion) || DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_REGION
    );
  }

  get isExecutingInsideCodebuild() {
    return !!process.env.STP_CODEBUILD;
  }

  get targetAwsAccount(): GlobalStateConnectedAwsAccount {
    if (this.localTargetAwsAccount) {
      return this.localTargetAwsAccount;
    }
    const awsAccount = this.args.awsAccount || this.persistedState?.cliArgsDefaults.awsAccount;
    if (awsAccount) {
      const account = this.connectedAwsAccounts?.find(({ name }) => name === awsAccount);
      if (!account) {
        throw stpErrors.e65({
          accountName: awsAccount,
          organizationName: this.organizationData.name,
          connectedAwsAccounts: this.connectedAwsAccounts
        });
      }
      return account;
    }
    if (this.connectedAwsAccounts.length < 1) {
      throw stpErrors.e66({ organizationName: this.organizationData.name });
    }
    if (this.connectedAwsAccounts.length > 1) {
      throw stpErrors.e67({
        organizationName: this.organizationData.name,
        connectedAwsAccounts: this.connectedAwsAccounts
      });
    }
    return this.connectedAwsAccounts[0];
  }

  markDomainServiceAsInitialized = (domainServiceName: DomainServiceName) => {
    this.initializedDomainServices.push(domainServiceName);
  };

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

  saveApiKey = async ({ apiKey }: { apiKey: string }) => {
    return savePersistedState({
      ...this.persistedState,
      otherDefaults: { ...this.persistedState.otherDefaults, apiKey }
    });
  };

  loadUserCredentials = async () => {
    // Only load user data if not already loaded (ensureAwsAccountConnected may have done this)
    if (!this.userData || !this.organizationData) {
      await stacktapeTrpcApiManager.init({ apiKey: this.apiKey });
      await this.loadUserDataFromTrpcApi();
    }
    await this.loadValidatedAwsCredentials();
  };

  loadLocalAwsCredentials = async (): Promise<AwsCredentialsProvider> => {
    await eventManager.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });

    const selectedProfile =
      this.rawArgs.profile || process.env.AWS_PROFILE || this.persistedState?.cliArgsDefaults.profile;
    const credentialsProvider = defaultProvider(selectedProfile ? { profile: selectedProfile } : {});
    const credentials = await credentialsProvider();
    const identity = await getAwsCredentialsIdentity({ credentials });
    if (!identity.Account || !identity.Arn) {
      throw new Error('AWS STS returned an incomplete caller identity.');
    }

    this.localCredentialsProvider = credentialsProvider;
    this.credentials = {
      ...credentials,
      source: 'providerChain',
      identity: {
        account: identity.Account,
        arn: identity.Arn
      }
    };
    this.localTargetAwsAccount = {
      id: `local:${identity.Account}`,
      organizationId: 'local',
      awsAccountId: identity.Account,
      connectionMode: 'BASIC',
      name: selectedProfile || 'local credential chain',
      state: 'ACTIVE',
      primaryRegions: [this.region],
      defaultRegion: this.region
    };

    await eventManager.finishEvent({
      eventType: 'LOAD_AWS_CREDENTIALS',
      finalMessage: selectedProfile
        ? `Loaded from AWS profile ${tuiManager.makeBold(selectedProfile)}.`
        : 'Loaded from the standard AWS credential chain.'
    });
    return credentialsProvider;
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
  };

  loadValidatedAwsCredentials = async (): Promise<ValidatedAwsCredentials> => {
    await eventManager.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });
    validateAwsAccountUsability({ account: this.targetAwsAccount, organization: this.organizationData });

    // loading method API
    const loadCredentialsUsingApi = async (): Promise<LoadedAwsCredentials> => {
      const { credentials } = await stacktapeTrpcApiManager.apiClient.awsAccountCredentials({
        awsAccountName: this.targetAwsAccount.name
      });
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
      targetAccount: this.targetAwsAccount,
      profile: this.awsProfileName
    });

    this.credentials = validatedCredentials;

    // if credentials have expiration set refresh timeout
    if (this.credentials.expiration) {
      await this.scheduleCredentialRefresh(this.credentials.expiration);
    }
    const loadedFrom = {
      envVar: 'Environment variables',
      credentialsFile: 'System-wide credentials file',
      providerChain: 'AWS credential provider chain',
      api: 'Stacktape API',
      assumeRole: 'Assumed role'
    }[this.credentials.source];
    await eventManager.finishEvent({
      eventType: 'LOAD_AWS_CREDENTIALS',
      finalMessage: `Loaded from ${tuiManager.makeBold(loadedFrom)}.`
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
        eventManager.finishEvent({
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
      return this.isExecutingInsideCodebuild
        ? process.env.CODEBUILD_LOG_PATH
        : `${stackName}/${kebabCase(this.command)}/${this.invocationId}`;
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
    // await eventManager.startEvent({
    //   eventType: 'LOAD_TARGET_STACK_INFO',
    //   description: 'Loading target stack info'
    // });
    const { id: projectId, name: projectName } = await this.#resolveTargetProject({ configProjectName });
    const stage = await this.#resolveStage();
    const stackName = `${projectName}-${stage}`;
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
    // await eventManager.finishEvent({
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
    const stackName = `${projectName}-${stage}`;
    this.targetStack = {
      projectName,
      stackName,
      stage,
      globallyUniqueStackHash: getGloballyUniqueStackHash({
        region: this.region,
        accountId: this.targetAwsAccount.awsAccountId,
        stackName
      })
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

  #resolveTargetProject = async ({ configProjectName }: { configProjectName?: string }) => {
    const createNewProject = async (projectName?: string) => {
      let chosenProjectName = projectName;
      if (!chosenProjectName) {
        chosenProjectName = await tuiManager.promptText({
          message: 'Enter name for your project (i.e "my-todo-app"). Use only letters, numbers and dashes.'
        });
      }
      validateProjectName(chosenProjectName);
      const projectInfo = await stacktapeTrpcApiManager.apiClient.createProject({
        name: chosenProjectName,
        configPath: this.args.configPath,
        templateId: this.args.templateId,
        // gitUrl: (await gitInfoManager.gitInfo).gitUrl,
        region: this.region
      });
      return projectInfo;
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

    const projectNameComesFromConfig = projectName === configProjectName;

    // A project declared in config is intentional, so it can be created without a second confirmation.
    if (!this.projects?.length || (this.args as StacktapeCliArgs).autoConfirmOperation || projectNameComesFromConfig) {
      return createNewProject(projectName);
    }

    // if we got this far and this is not TTY, throw error
    if (process.env.CI || !process.stdout.isTTY) {
      throw stpErrors.e103(null);
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
