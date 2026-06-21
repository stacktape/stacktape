import type {
  ApiKeyTrpcClient,
  AwsAccountCredentialsParams,
  AwsAccountCredentialsResponse,
  CanDeployResponse,
  ConfigureEc2RunnerFromCliParams,
  ConfigureEc2RunnerFromCliResponse,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
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
} from '../../types/console-app/trpc/api-key-protected';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/params';
import { createTypedTrpcClient } from './client';

export type {
  AwsAccountCredentialsParams,
  AwsAccountCredentialsResponse,
  CanDeployResponse,
  ConfigureEc2RunnerFromCliParams,
  ConfigureEc2RunnerFromCliResponse,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
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
} from '../../types/console-app/trpc/api-key-protected';

const createTrpcApiKeyProtectedClient = ({ apiKey }: { apiKey: string }) => {
  return createTypedTrpcClient<ApiKeyTrpcClient>({
    url: STACKTAPE_TRPC_API_ENDPOINT,
    headers: {
      stp_api_key: apiKey
    }
  });
};

export class ApiKeyProtectedClient {
  #client: ApiKeyTrpcClient | null = null;

  init = async ({ apiKey }: { apiKey: string }) => {
    this.#client = createTrpcApiKeyProtectedClient({ apiKey });
  };

  #ensureInitialized = () => {
    if (!this.#client) {
      throw new Error('ApiKeyProtectedClient not initialized. Call init({ apiKey }) first.');
    }

    return this.#client;
  };

  // Legacy API name: this records Stacktape CLI operations in the console,
  // including commands that are not direct stack deploy/delete operations.
  recordStackOperation = async (args: RecordStackOperationParams): Promise<void> => {
    return this.#ensureInitialized().recordStackOperation.mutate(args);
  };

  globalConfig = async (): Promise<GlobalConfigResponse> => {
    return this.#ensureInitialized().globalConfig.query();
  };

  currentUserAndOrgData = async (): Promise<CurrentUserAndOrgDataResponse> => {
    return this.#ensureInitialized().currentUserAndOrgData.query();
  };

  ec2DeployFromCli = async (args: Ec2DeployFromCliParams): Promise<Ec2DeployFromCliResponse> => {
    return this.#ensureInitialized().ec2DeployFromCli.mutate(args);
  };

  ec2DeployStatusFromCli = async (args: Ec2DeployStatusFromCliParams): Promise<Ec2DeployStatusFromCliResponse> => {
    return this.#ensureInitialized().ec2DeployStatusFromCli.query(args);
  };

  configureEc2RunnerFromCli = async (
    args: ConfigureEc2RunnerFromCliParams
  ): Promise<ConfigureEc2RunnerFromCliResponse> => {
    return this.#ensureInitialized().configureEc2RunnerFromCli.mutate(args);
  };

  awsAccountCredentials = async (args: AwsAccountCredentialsParams): Promise<AwsAccountCredentialsResponse> => {
    return this.#ensureInitialized().awsAccountCredentials.query(args);
  };

  template = async (args: TemplateParams): Promise<TemplateResponse> => {
    return this.#ensureInitialized().template.query(args);
  };

  canDeploy = async (): Promise<CanDeployResponse> => {
    return this.#ensureInitialized().canDeploy.query();
  };

  defaultDomainsInfo = async (args: DefaultDomainsInfoParams): Promise<DefaultDomainsInfoResponse> => {
    return this.#ensureInitialized().defaultDomainsInfo.query(args);
  };

  createProject = async (args: CreateProjectParams): Promise<CreateProjectResponse> => {
    return this.#ensureInitialized().createProjectFromCli.mutate(args);
  };

  createOrganization = async (args: CreateOrganizationParams): Promise<CreateOrganizationResponse> => {
    return this.#ensureInitialized().createOrganizationFromCli.mutate(args);
  };

  listOrganizations = async (): Promise<ListOrganizationsResponse> => {
    return this.#ensureInitialized().listOrganizationsFromCli.query();
  };

  deleteOrganization = async (args: DeleteOrganizationParams): Promise<DeleteOrganizationResponse> => {
    return this.#ensureInitialized().deleteOrganizationFromCli.mutate(args);
  };

  deleteUndeployedStage = async (args: DeleteUndeployedStageParams): Promise<DeleteUndeployedStageResponse> => {
    return this.#ensureInitialized().deleteUndeployedStageFromCli.mutate(args);
  };

  initAwsConnectionForCli = async (args: InitAwsConnectionForCliInput): Promise<InitAwsConnectionForCliResponse> => {
    return this.#ensureInitialized().initAwsConnectionForCli.mutate(args);
  };

  createAwsConnectionPending = async (
    args: CreateAwsConnectionPendingInput
  ): Promise<CreateAwsConnectionPendingResponse> => {
    return this.#ensureInitialized().createAwsConnectionPending.mutate(args);
  };

  getAwsConnectionStatus = async (args: GetAwsConnectionStatusInput): Promise<GetAwsConnectionStatusResponse> => {
    return this.#ensureInitialized().getAwsConnectionStatus.query(args);
  };

  getGitProviderConnectionStatus = async (
    args: GetGitProviderConnectionStatusInput
  ): Promise<GetGitProviderConnectionStatusResponse> => {
    return this.#ensureInitialized().getGitProviderConnectionStatus.query(args);
  };

  createGitDeploymentConfigFromCli = async (
    args: CreateGitDeploymentConfigFromCliInput
  ): Promise<CreateGitDeploymentConfigFromCliResponse> => {
    return this.#ensureInitialized().createGitDeploymentConfigFromCli.mutate(args);
  };

  projectsWithStages = async (): Promise<ProjectsWithStagesResponse> => {
    return this.#ensureInitialized().projectsWithStages.query();
  };

  recentStackOperations = async (args: RecentStackOperationsParams): Promise<RecentStackOperationsResponse> => {
    return this.#ensureInitialized().recentStackOperations.query(args);
  };

  organizationActivity = async (args: OrganizationActivityParams): Promise<OrganizationActivityResponse> => {
    return this.#ensureInitialized().organizationActivityFromCli.query(args);
  };

  stackDetails = async (args: StackDetailsParams): Promise<StackDetailsResponse> => {
    return this.#ensureInitialized().stackDetails.query(args);
  };

  reportEvent = async (args: ReportEventParams): Promise<string> => {
    return this.#ensureInitialized().reportEvent.mutate(args);
  };

  listIssues = async (args: ListIssuesParams): Promise<ListIssuesResponse> => {
    return this.#ensureInitialized().issuesFromCli.query(args);
  };

  resolveIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#ensureInitialized().resolveIssueFromCli.mutate(args);
  };

  ignoreIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#ensureInitialized().ignoreIssueFromCli.mutate(args);
  };

  reopenIssue = async (args: IssueActionParams): Promise<IssueActionResponse> => {
    return this.#ensureInitialized().reopenIssueFromCli.mutate(args);
  };
}
