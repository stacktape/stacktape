import { dirname, isAbsolute, join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { commandsNotRequiringApiKey } from '@cli-config';
import {
  DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_NAME,
  DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_REGION,
  RECORDED_STACKTAPE_COMMANDS
} from '@config';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { getRoleArnFromSessionArn } from '@shared/naming/utils';
import { getGloballyUniqueStackHash } from '@shared/utils/hashing';
import { propertyFromObjectOrNull } from '@shared/utils/misc';
import { userPrompt } from '@shared/utils/user-prompt';
import { listAwsProfiles, loadAwsConfigFileContent } from '@utils/aws-config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { memoizeGetters } from '@utils/decorators';
import { loadHelperLambdaDetails } from '@utils/helper-lambdas';
import { getAwsSynchronizedTime } from '@utils/time';
import { tuiManager } from '@utils/tui';
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
import { createTemporaryMixpanelUser, loadPersistedState, savePersistedState } from './utils';

@memoizeGetters
export class GlobalStateManager {
  isInitialized = false;
  persistedState: PersistedState;
  awsConfigFileContent: any;
  availableAwsProfiles: Awaited<ReturnType<typeof listAwsProfiles>>;
  helperLambdaDetails: HelperLambdaDetails;
  rawCommands: StacktapeCommand[];
  rawArgs: StacktapeArgs;
  maxAllowedResources: number;
  commandRequiresConfig: boolean;
  presetConfig?: StacktapeConfig;
  rawOptions?: StacktapeProgrammaticOptions;
  initializedDomainServices: DomainServiceName[] = [];
  additionalArgs: Record<string, string | boolean>;
  invokedFrom: InvokedFrom;
  systemId: string;
  operationStart: Date;
  configPath: string = null;
  invocationId = process.env.STP_INVOCATION_ID || `${dayjs().format('YYYY-MM-DDTHH-mm-ss-SSS')}_${generateShortUuid()}`;
  // populated with initial dummy variables so that resource resolving can work without loaded credentials
  credentials: ValidatedAwsCredentials = {
    identity: { account: '123456789999', arn: 'arn:aws:iam::123456789999:user/dummy' }
  } as ValidatedAwsCredentials;

  credentialsRefreshTimeout: NodeJS.Timeout;
  userData?: GlobalStateUser;
  organizationData?: GlobalStateOrganization;
  connectedAwsAccounts?: GlobalStateConnectedAwsAccount[];
  projects: GlobalStateProject[];
  // populated with initial dummy variables so that resource resolving can work without using trpc api
  targetStack: {
    stackName: string;
    globallyUniqueStackHash: string;
    stage: string;
    projectName: string;
    projectId: string;
  };

  apiKey: string;

  init = async (opts?: StacktapeProgrammaticOptions) => {
    this.operationStart = new Date();
    this.rawOptions = opts;
    const { commands, args, config, invokedFrom, additionalArgs } = opts;
    if (invokedFrom === 'server') {
      this.targetStack = {
        stackName: 'project-stage',
        globallyUniqueStackHash: 'xxxxxxxx',
        stage: 'stage',
        projectName: 'project',
        projectId: 'project-id'
      };
    }
    this.invokedFrom = invokedFrom || 'cli';
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
        loadHelperLambdaDetails({ invokedFrom })
      ]);
    if (config) {
      this.presetConfig = config;
    }
    validateArgs({
      rawArgs: this.rawArgs,
      command: this.command,
      defaults: this.persistedState.cliArgsDefaults,
      fromEnv: {
        region: process.env.AWS_DEFAULT_REGION,
        profile: process.env.AWS_PROFILE,
        awsAccount: process.env.AWS_ACCOUNT,
        projectName: process.env.PROJECT_NAME
      }
    });
    // persisted system ID can be also loaded from env variable. This is necessary when running `codebuild:deploy`
    const persistedSystemId = this.persistedState?.systemId || process.env.STP_ORIGINAL_SYSTEM_ID;
    this.systemId = persistedSystemId || generateUuid();
    if (!persistedSystemId) {
      await Promise.all([this.saveSystemId(), createTemporaryMixpanelUser(this.systemId)]);
    }
    this.maxAllowedResources = Infinity; // maxAllowedResources || freeMaxAllowedResources;
    this.apiKey = process.env.STACKTAPE_API_KEY || this.persistedState?.otherDefaults?.apiKey;
    if (!this.apiKey && !commandsNotRequiringApiKey.includes(this.command) && this.invokedFrom !== 'server') {
      if (process.stdout.isTTY) {
        const res = await userPrompt({
          type: 'password',
          name: 'apiKey',
          message: `Your Stacktape API key (available in the ${tuiManager.getLink('apiKeys', 'console')})`
        });
        this.apiKey = res.apiKey;
        await this.saveApiKey({ apiKey: res.apiKey });
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
    // const { awsRegion, stage, profile } = this.persistedState?.defaults || {};
    // return deletePropertiesWithValues({ region: awsRegion as AWSRegion, profile, stage, ...this.rawArgs }, [
    //   undefined,
    //   null
    // ]);
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

  get folderContainingUserModules() {
    return this.workingDir;
  }

  get isDebugMode() {
    return process.env.STP_DEBUG === 'true' || this.logLevel === 'debug';
  }

  get logFormat(): LogFormat {
    if (this.invokedFrom !== 'cli') {
      return 'json';
    }
    let logFormat = propertyFromObjectOrNull(this.args, 'logFormat') || 'fancy';
    if (logFormat === 'fancy' && !process.stdout.isTTY) {
      logFormat = 'normal';
    }
    return logFormat;
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
    // this is to make resource resolving work without trpc api (to speed it up)
    if (this.invokedFrom === 'server') {
      return {
        awsAccountId: '123456789999',
        connectionMode: 'BASIC',
        name: 'Dummy'
      } as GlobalStateConnectedAwsAccount;
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
    await stacktapeTrpcApiManager.init({ apiKey: this.apiKey });
    await this.loadUserDataFromTrpcApi();
    await this.loadValidatedAwsCredentials();
  };

  loadUserDataFromTrpcApi = async () => {
    const { user, organization, connectedAwsAccounts, projects } =
      await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
    this.userData = user;
    this.organizationData = organization;
    this.connectedAwsAccounts = connectedAwsAccounts || [];
    this.projects = projects || [];
    // const displayedOrgName = organization.name.endsWith('-personal-org') ? 'Personal' : organization.name;
  };

  loadValidatedAwsCredentials = async (): Promise<ValidatedAwsCredentials> => {
    await eventManager.startEvent({ eventType: 'LOAD_AWS_CREDENTIALS', description: 'Loading AWS credentials' });
    validateAwsAccountUsability({ account: this.targetAwsAccount, organization: this.organizationData });
    // refresh method
    const getRefreshTimeout = async (credentialsExpiration: Date) => {
      const msUntilExpiration = new Date(credentialsExpiration).getTime() - (await getAwsSynchronizedTime()).getTime();
      // refresh credentials one minute before expiring
      return setTimeout(this.loadValidatedAwsCredentials, msUntilExpiration - 60 * 1000);
    };

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
      const credentials = await awsSdkManager.getAssumedRoleCredentials({
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
    // if credentials are already set, we only need to refresh them
    if (credentialsAlreadySet) {
      // depending on the original source of credentials, the method for refreshing is different
      // if we got current credentials through API we will refresh them using API
      if (this.credentials.source === 'api') {
        creds = await loadCredentialsUsingApi();
      }
      // if we got current credentials using env which also have expiration we are making 2 assumptions
      // 1. we assume, that the credentials were generated by assuming role
      // 2. we assume that the assumed role has self-trust (i.e it can assume itself)
      // based on the variable and assumptions we are refreshing credentials by re-assuming role again
      // these assumptions should hold true for credentials assumed within codebuild:deploy
      // however in future we might implement better mechanism and get rid of these assumptions
      if (
        (this.credentials.source === 'envVar' && this.credentials.expiration) ||
        this.credentials.source === 'assumeRole'
      ) {
        creds = await loadCredentialsUsingReAssumeRole();
      }

      // if (creds.expiration) {
      //   this.credentialsRefreshTimeout = getRefreshTimeout(creds.expiration);
      // }
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

    // we are reassigning properties of the object instead of assigning new object
    // this way, everyone who has reference to globalStateManager.credentials stored always has access to current creds
    // this is important for awsSdkManager which uses these credentials
    this.credentials.accessKeyId = validatedCredentials.accessKeyId;
    this.credentials.secretAccessKey = validatedCredentials.secretAccessKey;
    this.credentials.sessionToken = validatedCredentials.sessionToken;
    this.credentials.expiration = validatedCredentials.expiration;
    this.credentials.identity = validatedCredentials.identity;
    this.credentials.source = validatedCredentials.source;

    // if credentials have expiration set refresh timeout
    if (this.credentials.expiration) {
      clearTimeout(this.credentialsRefreshTimeout);
      this.credentialsRefreshTimeout = await getRefreshTimeout(this.credentials.expiration);
      applicationManager.registerCleanUpHook(() => clearTimeout(this.credentialsRefreshTimeout));
    }
    const loadedFrom = {
      envVar: 'Environment variables',
      credentialsFile: 'System-wide credentials file',
      api: 'Stacktape API',
      assumeRole: 'Assumed role'
    }[this.credentials.source];
    await eventManager.finishEvent({
      eventType: 'LOAD_AWS_CREDENTIALS',
      finalMessage: `Loaded from ${tuiManager.makeBold(loadedFrom)}.`
    });
    return this.credentials;
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

  loadTargetStackInfo = async () => {
    // await eventManager.startEvent({
    //   eventType: 'LOAD_TARGET_STACK_INFO',
    //   description: 'Loading target stack info'
    // });
    const { id: projectId, name: projectName } = await this.#resolveTargetProject();
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

  #resolveStage = async () => {
    let stage = this.args.stage || this.persistedState?.cliArgsDefaults.stage;
    if (!stage) {
      ({ stage } = await userPrompt({
        type: 'text',
        name: 'stage',
        message: 'Enter stage (environment) for the operation (i.e production, test or staging)',
        initial: 'test'
      }));
    }
    return stage;
  };

  #resolveTargetProject = async () => {
    const createNewProject = async (projectName?: string) => {
      let chosenProjectName = projectName;
      if (!chosenProjectName) {
        ({ chosenProjectName } = await userPrompt({
          type: 'text',
          name: 'chosenProjectName',
          message: 'Enter name for your project (i.e "my-todo-app"). Use only letters, numbers and dashes.'
        }));
      }
      validateProjectName(chosenProjectName);
      // console.log(' !!! do not forget to uncomment this !!!');
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
      const { existingProjectName } = await userPrompt({
        type: 'select',
        name: 'existingProjectName',
        message: 'Select existing project',
        choices: this.projects
          .sort((p1, p2) => p1.name.localeCompare(p2.name))
          .map(({ name }) => ({ title: name, value: name }))
      });
      return this.projects.find(({ name }) => name === existingProjectName);
    };
    if (configManager.configResolver.rawConfig?.serviceName) {
      tuiManager.warn(
        `Using ${tuiManager.prettyConfigProperty('serviceName')} property in config is deprecated. Use "--projectName <<serviceName>>" (${tuiManager.colorize('gray', `--projectName ${configManager.configResolver.rawConfig?.serviceName}`)}) option instead.`
      );
    }
    const projectName =
      this.args.projectName ||
      this.persistedState?.cliArgsDefaults.projectName ||
      configManager.configResolver.rawConfig?.serviceName; // || this.targetStack.projectName
    if (!projectName) {
      if (this.invokedFrom !== 'cli' || (this.args as StacktapeCliArgs).autoConfirmOperation || !process.stdout.isTTY) {
        throw stpErrors.e103(null);
      }
      if (this.projects.length) {
        // Prompt user wether he wants to Choose existing project or create a new one
        const { newOrExisting } = await userPrompt({
          type: 'select',
          name: 'newOrExisting',
          message: `Which project do you want to use? (You can also specify it using ${tuiManager.prettyOption('projectName')}).`,
          choices: [
            {
              title: 'Create new project',
              value: 'new'
            },
            {
              title: 'Choose existing project',
              value: 'existing'
            }
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

    const projectNameComesFromConfigServiceName = projectName === configManager.configResolver.rawConfig?.serviceName;

    // if there are no projects or autoConfirmOperation is enabled, or projectName comes from service name, we will automatically create a new one for the user
    if (
      !this.projects?.length ||
      (this.args as StacktapeCliArgs).autoConfirmOperation ||
      this.invokedFrom === 'sdk' ||
      projectNameComesFromConfigServiceName
    ) {
      return createNewProject(projectName);
    }

    // if we got this far and this is not TTY, throw error
    if (process.env.CI || !process.stdout.isTTY) {
      throw stpErrors.e103(null);
    }

    // if project name comes from serviceName we will skip this prompt and create project
    // otherwise we assume that user might have mistyped the "--projectName"
    if (!projectNameComesFromConfigServiceName) {
      const { newOrExisting } = await userPrompt({
        type: 'select',
        name: 'newOrExisting',
        message: `Project with name ${tuiManager.colorize('gray', projectName)} does not exist.`,
        choices: [
          {
            title: `Create project with name ${tuiManager.colorize('gray', `"${projectName}"`)}.`,
            value: 'new'
          },
          {
            title: 'Choose existing project',
            value: 'existing'
          }
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
