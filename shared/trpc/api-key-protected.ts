import type {
  ApiKeyTrpcClient,
  AwsAccountCredentialsParams,
  AwsAccountCredentialsResponse,
  CanDeployResponse,
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
  GlobalConfigResponse,
  ListOrganizationsResponse,
  ProjectsWithStagesResponse,
  RecentStackOperationsParams,
  RecentStackOperationsResponse,
  RecordStackOperationParams,
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
  GlobalConfigResponse,
  ListOrganizationsResponse,
  OrganizationSummary,
  ProjectsWithStagesResponse,
  RecentStackOperationsParams,
  RecentStackOperationsResponse,
  RecordStackOperationParams,
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

  recordStackOperation = async (args: RecordStackOperationParams): Promise<void> => {
    return this.#ensureInitialized().recordStackOperation.mutate(args);
  };

  globalConfig = async (): Promise<GlobalConfigResponse> => {
    return this.#ensureInitialized().globalConfig.query();
  };

  currentUserAndOrgData = async (): Promise<CurrentUserAndOrgDataResponse> => {
    return this.#ensureInitialized().currentUserAndOrgData.query();
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

  projectsWithStages = async (): Promise<ProjectsWithStagesResponse> => {
    return this.#ensureInitialized().projectsWithStages.query();
  };

  recentStackOperations = async (args: RecentStackOperationsParams): Promise<RecentStackOperationsResponse> => {
    return this.#ensureInitialized().recentStackOperations.query(args);
  };

  stackDetails = async (args: StackDetailsParams): Promise<StackDetailsResponse> => {
    return this.#ensureInitialized().stackDetails.query(args);
  };
}
