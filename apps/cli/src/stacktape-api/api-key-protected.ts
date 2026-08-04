import type {
  ApiKeyTrpcClient,
  AwsAccountCredentialsParams,
  AwsAccountCredentialsResponse,
  CanDeployResponse,
  ConfigureEc2RunnerFromCliParams,
  ConfigureEc2RunnerFromCliResponse,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
  CreateDeploymentTokenFromCliParams,
  CreateDeploymentTokenFromCliResponse,
  CreateGitDeploymentConfigFromCliInput,
  CreateGitDeploymentConfigFromCliResponse,
  CreateOrganizationParams,
  CreateOrganizationResponse,
  CreateProjectParams,
  CreateProjectResponse,
  CurrentUserAndOrgDataResponse,
  DefaultDomainsInfoParams,
  DefaultDomainsInfoResponse,
  DeleteOrganizationParams,
  DeleteOrganizationResponse,
  DeleteUndeployedStageParams,
  DeleteUndeployedStageResponse,
  Ec2DeployFromCliParams,
  Ec2DeployFromCliResponse,
  Ec2DeployStatusFromCliParams,
  Ec2DeployStatusFromCliResponse,
  GetAwsConnectionStatusInput,
  GetAwsConnectionStatusResponse,
  GetGitProviderConnectionStatusInput,
  GetGitProviderConnectionStatusResponse,
  GlobalConfigResponse,
  InitAwsConnectionForCliInput,
  InitAwsConnectionForCliResponse,
  IssueActionParams,
  IssueActionResponse,
  ListIssuesParams,
  ListIssuesResponse,
  ListOrganizationsResponse,
  OrganizationActivityParams,
  OrganizationActivityResponse,
  ProjectsWithStagesResponse,
  RecentStackOperationsParams,
  RecentStackOperationsResponse,
  RecordStackOperationParams,
  ReportEventParams,
  StackDetailsParams,
  StackDetailsResponse,
  TemplateParams,
  TemplateResponse
} from '@stacktape/console-api/api-key';
import { STACKTAPE_TRPC_API_ENDPOINT } from 'src/config/params';
import { createTypedTrpcClient } from './client';

export type {
  AwsAccountCredentialsParams,
  AwsAccountCredentialsResponse,
  CanDeployResponse,
  ConfigureEc2RunnerFromCliParams,
  ConfigureEc2RunnerFromCliResponse,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
  CreateDeploymentTokenFromCliParams,
  CreateDeploymentTokenFromCliResponse,
  CreateGitDeploymentConfigFromCliInput,
  CreateGitDeploymentConfigFromCliResponse,
  CreateOrganizationParams,
  CreateOrganizationResponse,
  CreateProjectParams,
  CreateProjectResponse,
  CurrentUserAndOrgDataResponse,
  DefaultDomainsInfoParams,
  DefaultDomainsInfoResponse,
  DeleteOrganizationParams,
  DeleteOrganizationResponse,
  DeleteUndeployedStageParams,
  DeleteUndeployedStageResponse,
  Ec2DeployFromCliParams,
  Ec2DeployFromCliResponse,
  Ec2DeployStatusFromCliParams,
  Ec2DeployStatusFromCliResponse,
  GetAwsConnectionStatusInput,
  GetAwsConnectionStatusResponse,
  GetGitProviderConnectionStatusInput,
  GetGitProviderConnectionStatusResponse,
  GlobalConfigResponse,
  InitAwsConnectionForCliInput,
  InitAwsConnectionForCliResponse,
  IssueActionParams,
  IssueActionResponse,
  ListIssuesParams,
  ListIssuesResponse,
  ListOrganizationsResponse,
  OrganizationActivityParams,
  OrganizationActivityResponse,
  OrganizationSummary,
  ProjectsWithStagesResponse,
  RecentStackOperationsParams,
  RecentStackOperationsResponse,
  RecordStackOperationParams,
  ReportEventParams,
  StackDetailsParams,
  StackDetailsResponse,
  TemplateParams,
  TemplateResponse
} from '@stacktape/console-api/api-key';

const createTrpcApiKeyProtectedClient = ({ apiKey }: { apiKey: string }) => {
  return createTypedTrpcClient<ApiKeyTrpcClient>({
    url: STACKTAPE_TRPC_API_ENDPOINT,
    headers: {
      stp_api_key: apiKey
    }
  });
};

type ApiKeyProcedureName = keyof ApiKeyTrpcClient;

export type ApiKeyRequestExecutor = <T>(procedure: ApiKeyProcedureName, request: () => Promise<T>) => Promise<T>;

const executeRequestDirectly: ApiKeyRequestExecutor = (_procedure, request) => request();

export class ApiKeyProtectedClient {
  #client: ApiKeyTrpcClient | null = null;
  readonly #executeRequest: ApiKeyRequestExecutor;

  constructor({ executeRequest = executeRequestDirectly }: { executeRequest?: ApiKeyRequestExecutor } = {}) {
    this.#executeRequest = executeRequest;
  }

  init = async ({ apiKey }: { apiKey: string }) => {
    this.#client = createTrpcApiKeyProtectedClient({ apiKey });
  };

  #ensureInitialized = () => {
    if (!this.#client) {
      throw new Error('ApiKeyProtectedClient not initialized. Call init({ apiKey }) first.');
    }

    return this.#client;
  };

  #request = <T>(procedure: ApiKeyProcedureName, request: () => Promise<T>) => {
    return this.#executeRequest(procedure, request);
  };

  // Legacy API name: this records Stacktape CLI operations in the console,
  // including commands that are not direct stack deploy/delete operations.
  recordStackOperation = async (args: RecordStackOperationParams): Promise<void> => {
    await this.#request('recordStackOperation', () => this.#ensureInitialized().recordStackOperation.mutate(args));
  };

  globalConfig = async (): Promise<GlobalConfigResponse> => {
    return this.#request('globalConfig', () => this.#ensureInitialized().globalConfig.query());
  };

  currentUserAndOrgData = async (): Promise<CurrentUserAndOrgDataResponse> => {
    return this.#request('currentUserAndOrgData', () => this.#ensureInitialized().currentUserAndOrgData.query());
  };

  ec2DeployFromCli = async (args: Ec2DeployFromCliParams): Promise<Ec2DeployFromCliResponse> => {
    return this.#request('ec2DeployFromCli', () => this.#ensureInitialized().ec2DeployFromCli.mutate(args));
  };

  ec2DeployStatusFromCli = async (args: Ec2DeployStatusFromCliParams): Promise<Ec2DeployStatusFromCliResponse> => {
    return this.#request('ec2DeployStatusFromCli', () => this.#ensureInitialized().ec2DeployStatusFromCli.query(args));
  };

  configureEc2RunnerFromCli = async (
    args: ConfigureEc2RunnerFromCliParams
  ): Promise<ConfigureEc2RunnerFromCliResponse> => {
    return this.#request('configureEc2RunnerFromCli', () =>
      this.#ensureInitialized().configureEc2RunnerFromCli.mutate(args)
    );
  };

  createDeploymentTokenFromCli = async (
    args: CreateDeploymentTokenFromCliParams
  ): Promise<CreateDeploymentTokenFromCliResponse> => {
    return this.#request('createDeploymentTokenFromCli', () =>
      this.#ensureInitialized().createDeploymentTokenFromCli.mutate(args)
    );
  };

  awsAccountCredentials = async (args: AwsAccountCredentialsParams): Promise<AwsAccountCredentialsResponse> => {
    return this.#request('awsAccountCredentials', () => this.#ensureInitialized().awsAccountCredentials.query(args));
  };

  template = async (args: TemplateParams): Promise<TemplateResponse> => {
    return this.#request('template', () => this.#ensureInitialized().template.query(args));
  };

  canDeploy = async (): Promise<CanDeployResponse> => {
    return this.#request('canDeploy', () => this.#ensureInitialized().canDeploy.query());
  };

  defaultDomainsInfo = async (args: DefaultDomainsInfoParams): Promise<DefaultDomainsInfoResponse> => {
    return this.#request('defaultDomainsInfo', () => this.#ensureInitialized().defaultDomainsInfo.query(args));
  };

  createProject = async (args: CreateProjectParams): Promise<CreateProjectResponse> => {
    return this.#request('createProjectFromCli', () => this.#ensureInitialized().createProjectFromCli.mutate(args));
  };

  createOrganization = async (args: CreateOrganizationParams): Promise<CreateOrganizationResponse> => {
    return this.#request('createOrganizationFromCli', () =>
      this.#ensureInitialized().createOrganizationFromCli.mutate(args)
    );
  };

  listOrganizations = async (): Promise<ListOrganizationsResponse> => {
    return this.#request('listOrganizationsFromCli', () => this.#ensureInitialized().listOrganizationsFromCli.query());
  };

  deleteOrganization = async (args: DeleteOrganizationParams): Promise<DeleteOrganizationResponse> => {
    return this.#request('deleteOrganizationFromCli', () =>
      this.#ensureInitialized().deleteOrganizationFromCli.mutate(args)
    );
  };

  deleteUndeployedStage = async (args: DeleteUndeployedStageParams): Promise<DeleteUndeployedStageResponse> => {
    return this.#request('deleteUndeployedStageFromCli', () =>
      this.#ensureInitialized().deleteUndeployedStageFromCli.mutate(args)
    );
  };

  initAwsConnectionForCli = async (args: InitAwsConnectionForCliInput): Promise<InitAwsConnectionForCliResponse> => {
    return this.#request('initAwsConnectionForCli', () =>
      this.#ensureInitialized().initAwsConnectionForCli.mutate(args)
    );
  };

  createAwsConnectionPending = async (
    args: CreateAwsConnectionPendingInput
  ): Promise<CreateAwsConnectionPendingResponse> => {
    return this.#request('createAwsConnectionPending', () =>
      this.#ensureInitialized().createAwsConnectionPending.mutate(args)
    );
  };

  getAwsConnectionStatus = async (args: GetAwsConnectionStatusInput): Promise<GetAwsConnectionStatusResponse> => {
    return this.#request('getAwsConnectionStatus', () => this.#ensureInitialized().getAwsConnectionStatus.query(args));
  };

  getGitProviderConnectionStatus = async (
    args: GetGitProviderConnectionStatusInput
  ): Promise<GetGitProviderConnectionStatusResponse> => {
    return this.#request('getGitProviderConnectionStatus', () =>
      this.#ensureInitialized().getGitProviderConnectionStatus.query(args)
    );
  };

  createGitDeploymentConfigFromCli = async (
    args: CreateGitDeploymentConfigFromCliInput
  ): Promise<CreateGitDeploymentConfigFromCliResponse> => {
    return this.#request('createGitDeploymentConfigFromCli', () =>
      this.#ensureInitialized().createGitDeploymentConfigFromCli.mutate(args)
    );
  };

  projectsWithStages = async (): Promise<ProjectsWithStagesResponse> => {
    return this.#request('projectsWithStages', () => this.#ensureInitialized().projectsWithStages.query());
  };

  recentStackOperations = async (args: RecentStackOperationsParams): Promise<RecentStackOperationsResponse> => {
    return this.#request('recentStackOperations', () => this.#ensureInitialized().recentStackOperations.query(args));
  };

  organizationActivity = async (args: OrganizationActivityParams): Promise<OrganizationActivityResponse> => {
    return this.#request('organizationActivityFromCli', () =>
      this.#ensureInitialized().organizationActivityFromCli.query(args)
    );
  };

  stackDetails = async (args: StackDetailsParams): Promise<StackDetailsResponse> => {
    return this.#request('stackDetails', () => this.#ensureInitialized().stackDetails.query(args));
  };

  reportEvent = async (args: ReportEventParams): Promise<string> => {
    return this.#request('reportEvent', () => this.#ensureInitialized().reportEvent.mutate(args));
  };

  listIssues = async (args: ListIssuesParams): Promise<ListIssuesResponse> => {
    return this.#request('issuesFromCli', () => this.#ensureInitialized().issuesFromCli.query(args));
  };

  resolveIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#request('resolveIssueFromCli', () => this.#ensureInitialized().resolveIssueFromCli.mutate(args));
  };

  ignoreIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#request('ignoreIssueFromCli', () => this.#ensureInitialized().ignoreIssueFromCli.mutate(args));
  };

  reopenIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#request('reopenIssueFromCli', () => this.#ensureInitialized().reopenIssueFromCli.mutate(args));
  };
}
