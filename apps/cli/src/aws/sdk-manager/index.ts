import type { TuiManager as Printer } from '@application-services/tui-manager';
import type { CostExplorerTagsError } from '@domain-services/budget-manager/types';
import type { GitInformation } from '@utils/git-info-manager/types';
import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
import type { Budget } from '@aws-sdk/client-budgets';
import type { DistributionSummary } from '@aws-sdk/client-cloudfront';
import type { BatchGetBuildsCommandInput } from '@aws-sdk/client-codebuild';
import type { _InstanceType, InstanceTypeInfo, RouteTable, Subnet, Vpc } from '@aws-sdk/client-ec2';
import type { OpenSearchPartitionInstanceType } from '@aws-sdk/client-opensearch';
import type { StartSessionCommandInput, StartSessionResponse } from '@aws-sdk/client-ssm';
import { ACMClient } from '@aws-sdk/client-acm';
import { AutoScaling, DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import { BudgetsClient, DescribeBudgetsCommand } from '@aws-sdk/client-budgets';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListDistributionsCommand
} from '@aws-sdk/client-cloudfront';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import {
  ArtifactsType,
  BatchGetBuildsCommand,
  BatchGetProjectsCommand,
  BuildPhaseType,
  CodeBuildClient,
  ComputeType,
  CreateProjectCommand,
  EnvironmentType,
  EnvironmentVariableType,
  SourceType,
  StartBuildCommand,
  StatusType
} from '@aws-sdk/client-codebuild';
import { CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CostExplorerClient, GetTagsCommand } from '@aws-sdk/client-cost-explorer';
import {
  DescribeInstanceTypesCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  EC2Client
} from '@aws-sdk/client-ec2';
import { ECRClient } from '@aws-sdk/client-ecr';
import { ECSClient } from '@aws-sdk/client-ecs';
import { IAMClient } from '@aws-sdk/client-iam';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { DescribeInstanceTypeLimitsCommand, OpenSearchClient } from '@aws-sdk/client-opensearch';
import { DescribeDBClustersCommand, DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds';
import { GetTagKeysCommand, ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import { Route53Client } from '@aws-sdk/client-route-53';
import { Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import { S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SESClient } from '@aws-sdk/client-ses';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import {
  ListCommandInvocationsCommand,
  SendCommandCommand,
  SSMClient,
  StartSessionCommand,
  TerminateSessionCommand
} from '@aws-sdk/client-ssm';
import { STSClient } from '@aws-sdk/client-sts';
// import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { createWaiter, WaiterState } from '@aws-sdk/util-waiter';
import { consoleLinks } from '@stacktape/naming/console-links';
import { resourceURIs } from 'src/utils/aws-resource-uris';
import { wait } from '@utils/misc';
import { CliError } from '@utils/errors';
import { getForwardableOperationInvocationEnv } from '@application-services/operation-invocation-context';
import { kebabCase } from 'change-case';
import {
  applyAwsClientPlugins,
  awsClientConfig,
  createAwsClientContext,
  type AwsClientContext,
  type AwsClientContextInput,
  type AwsClientWithMiddleware
} from '../context';
import { AwsObservability } from '../observability';
import { AwsParameterStore } from '../parameter-store';
import { AwsSecrets } from '../secrets';
import { AwsDomains } from '../domains';
import { AwsCloudFormationStacks } from '../cloudformation-stacks';
import { AwsCloudFormationRegistry } from '../cloudformation-registry';
import { AwsS3 } from '../s3';
import { S3Sync } from '../s3-sync';
import { AwsIam } from '../iam';
import { AwsSts } from '../identity';
import { AwsEcr } from '../ecr';
import { AwsLambda } from '../lambda';
import { AwsEcs } from '../ecs';
import { defaultGetErrorFunction, transformToCliArgs } from './utils';

const getOperationInvocationCodebuildEnvVariables = () => {
  return Object.entries(getForwardableOperationInvocationEnv()).map(([name, value]) => ({
    name,
    value,
    type: EnvironmentVariableType.PLAINTEXT
  }));
};

export class AwsSdkManager {
  #context?: AwsClientContext;
  #observability?: AwsObservability;
  #parameterStore?: AwsParameterStore;
  #secrets?: AwsSecrets;
  #domains?: AwsDomains;
  #cloudFormation?: AwsCloudFormationStacks;
  #cloudFormationRegistry?: AwsCloudFormationRegistry;
  #s3?: AwsS3;
  #iam?: AwsIam;
  #sts?: AwsSts;
  #ecr?: AwsEcr;
  #lambda?: AwsLambda;
  #ecs?: AwsEcs;
  printer?: Printer;
  #getErrorHandler: (message: string) => (err: Error) => never = defaultGetErrorFunction;

  init({
    credentials,
    endpoint,
    region,
    plugins,
    getErrorHandlerFn,
    printer
  }: {
    credentials: AwsClientContextInput['credentials'];
    endpoint?: string;
    region: AwsClientContextInput['region'];
    plugins?: AwsClientContextInput['plugins'];
    getErrorHandlerFn?: (message: string) => (err: Error) => never;
    printer?: Printer | undefined;
  }) {
    this.#context = createAwsClientContext({ credentials, endpoint, plugins, region });
    this.#getErrorHandler = getErrorHandlerFn || defaultGetErrorFunction;
    this.printer = printer;
    this.#parameterStore = new AwsParameterStore({
      createClient: (clientRegion) => this.#ssm(clientRegion),
      getErrorHandler: this.#getErrorHandler,
      printer
    });
    this.#observability = new AwsObservability({
      createCloudWatchClient: () => this.#cloudwatch(),
      createLogsClient: () => this.#cloudwatchLogs(),
      getErrorHandler: this.#getErrorHandler,
      printer
    });
    this.#secrets = new AwsSecrets({
      createClient: () => this.#secretsManager(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#domains = new AwsDomains({
      createAcmClient: (useUsEast1) => (useUsEast1 ? this.#usEast1Acm() : this.#acm()),
      createRoute53Client: () => this.#route53(),
      createRoute53DomainsClient: () => this.#route53Domains(),
      createSesClient: () => this.#ses(),
      createSesV2Client: () => this.#sesv2(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#cloudFormation = new AwsCloudFormationStacks({
      createClient: (clientRegion) => this.#cloudformation(clientRegion),
      getErrorHandler: this.#getErrorHandler
    });
    this.#cloudFormationRegistry = new AwsCloudFormationRegistry({
      createClient: () => this.#cloudformation(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#s3 = new AwsS3({
      createClient: () => this.#s3Client(),
      createAcceleratedClient: () => this.#acceleratedS3Client(),
      createSyncClient: () => this.#syncS3Client(),
      createAcceleratedSyncClient: () => this.#acceleratedSyncS3Client(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#iam = new AwsIam({
      createClient: () => this.#iamClient(),
      getErrorHandler: this.#getErrorHandler,
      printer
    });
    this.#sts = new AwsSts({
      createClient: () => this.#stsClient(),
      getErrorHandler: this.#getErrorHandler,
      printer
    });
    this.#ecr = new AwsEcr({
      createClient: () => this.#ecrClient(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#lambda = new AwsLambda({
      createClient: () => this.#lambdaClient(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#ecs = new AwsEcs({
      createClient: () => this.#ecsClient(),
      createCodeDeployClient: () => this.#codeDeployClient(),
      getErrorHandler: this.#getErrorHandler
    });
  }

  get isInitialized() {
    return this.#context !== undefined;
  }

  get region() {
    return this.#getContext().region;
  }

  get plugins() {
    return this.#getContext().plugins;
  }

  get credentialsProvider() {
    return this.#getContext().credentials;
  }

  get parameterStore() {
    this.#getContext();
    if (!this.#parameterStore) {
      throw new Error('AWS Parameter Store has not been initialized.');
    }
    return this.#parameterStore;
  }

  get observability() {
    this.#getContext();
    if (!this.#observability) {
      throw new Error('AWS observability services have not been initialized.');
    }
    return this.#observability;
  }

  get secrets() {
    this.#getContext();
    if (!this.#secrets) {
      throw new Error('AWS Secrets Manager has not been initialized.');
    }
    return this.#secrets;
  }

  get domains() {
    this.#getContext();
    if (!this.#domains) {
      throw new Error('AWS domain services have not been initialized.');
    }
    return this.#domains;
  }

  get cloudFormation() {
    this.#getContext();
    if (!this.#cloudFormation) {
      throw new Error('AWS CloudFormation has not been initialized.');
    }
    return this.#cloudFormation;
  }

  get cloudFormationRegistry() {
    this.#getContext();
    if (!this.#cloudFormationRegistry) {
      throw new Error('AWS CloudFormation registry has not been initialized.');
    }
    return this.#cloudFormationRegistry;
  }

  get s3() {
    this.#getContext();
    if (!this.#s3) {
      throw new Error('AWS S3 has not been initialized.');
    }
    return this.#s3;
  }

  get iam() {
    this.#getContext();
    if (!this.#iam) {
      throw new Error('AWS IAM has not been initialized.');
    }
    return this.#iam;
  }

  get sts() {
    this.#getContext();
    if (!this.#sts) {
      throw new Error('AWS STS has not been initialized.');
    }
    return this.#sts;
  }

  get ecr() {
    this.#getContext();
    if (!this.#ecr) {
      throw new Error('AWS ECR has not been initialized.');
    }
    return this.#ecr;
  }

  get lambda() {
    this.#getContext();
    if (!this.#lambda) {
      throw new Error('AWS Lambda has not been initialized.');
    }
    return this.#lambda;
  }

  get ecs() {
    this.#getContext();
    if (!this.#ecs) {
      throw new Error('AWS ECS has not been initialized.');
    }
    return this.#ecs;
  }

  #getContext() {
    if (!this.#context) {
      throw new Error('AWS SDK manager has not been initialized.');
    }
    return this.#context;
  }

  #getClientArgs(overrides?: Parameters<typeof awsClientConfig>[1]) {
    return awsClientConfig(this.#getContext(), overrides);
  }

  #applyPlugins<TClient extends AwsClientWithMiddleware>(client: TClient): TClient {
    return applyAwsClientPlugins(client, this.plugins);
  }

  #iamClient() {
    return this.#applyPlugins(new IAMClient(this.#getClientArgs()));
  }

  #secretsManager() {
    return this.#applyPlugins(new SecretsManagerClient(this.#getClientArgs()));
  }

  #ssm(region: string = this.region) {
    return this.#applyPlugins(new SSMClient(this.#getClientArgs({ region })));
  }

  #cloudformation(region: string = this.region) {
    return this.#applyPlugins(
      new CloudFormationClient({
        ...this.#getClientArgs({ region }),
        apiVersion: '2015-07-09'
      })
    );
  }

  #codeDeployClient() {
    return this.#applyPlugins(new CodeDeployClient(this.#getClientArgs()));
  }

  #codebuild() {
    return this.#applyPlugins(new CodeBuildClient(this.#getClientArgs()));
  }

  #cloudfront() {
    return this.#applyPlugins(new CloudFrontClient(this.#getClientArgs()));
  }

  #usEast1Acm() {
    return this.#applyPlugins(new ACMClient(this.#getClientArgs({ region: 'us-east-1' })));
  }

  #acceleratedS3Client() {
    return this.#applyPlugins(
      new S3Client(
        this.#getClientArgs({
          endpoint: this.#getContext().endpoint || 'https://s3-accelerate.amazonaws.com'
        })
      )
    );
  }

  #syncS3Client() {
    return new S3Sync({
      s3RetryCount: 5,
      clientArgs: this.#getClientArgs(),
      s3Plugins: [...this.plugins]
    });
  }

  #acceleratedSyncS3Client() {
    return new S3Sync({
      s3RetryCount: 5,
      clientArgs: this.#getClientArgs({
        endpoint: this.#getContext().endpoint || 'https://s3-accelerate.amazonaws.com'
      }),
      s3Plugins: [...this.plugins]
    });
  }

  #acm() {
    return this.#applyPlugins(new ACMClient(this.#getClientArgs()));
  }

  #route53() {
    return this.#applyPlugins(new Route53Client(this.#getClientArgs()));
  }

  #route53Domains() {
    return this.#applyPlugins(new Route53DomainsClient(this.#getClientArgs({ region: 'us-east-1' })));
  }

  #stsClient() {
    return this.#applyPlugins(new STSClient(this.#getClientArgs()));
  }

  #ecrClient() {
    return this.#applyPlugins(new ECRClient(this.#getClientArgs()));
  }

  #ecsClient() {
    return this.#applyPlugins(new ECSClient(this.#getClientArgs()));
  }

  #ec2() {
    return this.#applyPlugins(new EC2Client(this.#getClientArgs()));
  }

  #ec2AutoScaling() {
    return this.#applyPlugins(new AutoScaling(this.#getClientArgs()));
  }

  #ses() {
    return this.#applyPlugins(new SESClient(this.#getClientArgs()));
  }

  // note: we need both ses and sesv2 client because at the time of writing their methods do not overlap
  #sesv2() {
    return this.#applyPlugins(new SESv2Client(this.#getClientArgs()));
  }

  #s3Client() {
    return this.#applyPlugins(new S3Client(this.#getClientArgs()));
  }

  #rds() {
    return this.#applyPlugins(new RDSClient(this.#getClientArgs()));
  }

  #cloudwatchLogs() {
    return this.#applyPlugins(new CloudWatchLogsClient(this.#getClientArgs()));
  }

  #cloudwatch() {
    return this.#applyPlugins(new CloudWatchClient(this.#getClientArgs()));
  }

  #lambdaClient() {
    // In order to honor the overall maximum timeout set for the target process when invoking lambda,
    // the default 2 minutes from AWS SDK has to be overridden.
    return this.#applyPlugins(new LambdaClient(this.#getClientArgs({ requestTimeout: 900_000 })));
  }

  #openSearch() {
    return this.#applyPlugins(new OpenSearchClient(this.#getClientArgs()));
  }

  #resourceGroupsTaggingApi() {
    return this.#applyPlugins(new ResourceGroupsTaggingAPIClient(this.#getClientArgs()));
  }

  #costExplorer() {
    return this.#applyPlugins(new CostExplorerClient(this.#getClientArgs()));
  }

  #budgets() {
    return this.#applyPlugins(new BudgetsClient(this.#getClientArgs()));
  }

  getAllTagsUsedInRegion = async () => {
    const errHandler = this.#getErrorHandler('Could not fetch information about tags used in this region');
    const result: string[] = [];
    let { TagKeys, PaginationToken } = await this.#resourceGroupsTaggingApi()
      .send(new GetTagKeysCommand({}))
      .catch(errHandler);
    result.push(...(TagKeys || []));
    while (PaginationToken) {
      ({ TagKeys, PaginationToken } = await this.#resourceGroupsTaggingApi()
        .send(new GetTagKeysCommand({ PaginationToken }))
        .catch(errHandler));

      result.push(...(TagKeys || []));
    }
    return result;
  };

  getTagsUsableInCostExploring = async (): Promise<{ error?: CostExplorerTagsError; tags: string[] }> => {
    const errHandler = this.#getErrorHandler('Could not fetch information about tags usable for budget');
    const result: string[] = [];
    const currentDate = new Date();
    const yearBeforeNowDate = new Date();
    yearBeforeNowDate.setFullYear(currentDate.getFullYear() - 1);
    try {
      let { Tags, NextPageToken } = await this.#costExplorer().send(
        new GetTagsCommand({
          TimePeriod: {
            Start: yearBeforeNowDate.toISOString().slice(0, 10),
            End: currentDate.toISOString().slice(0, 10)
          }
        })
      );
      // .catch(errHandler);
      result.push(...(Tags || []));
      while (NextPageToken) {
        ({ Tags, NextPageToken } = await this.#costExplorer().send(
          new GetTagsCommand({
            NextPageToken,
            TimePeriod: {
              Start: yearBeforeNowDate.toISOString().slice(0, 10),
              End: currentDate.toISOString().slice(0, 10)
            }
          })
        ));
        // .catch(errHandler));

        result.push(...(Tags || []));
      }
    } catch (err) {
      if (`${err}`.includes('Data is not available')) {
        return { error: 'DATA_UNAVAILABLE', tags: [] };
      }
      if (`${err}`.includes('User not enabled for cost explorer')) {
        return { error: 'USER_NOT_ENABLED_FOR_COST_EXPLORER', tags: [] };
      }
      errHandler(err);
    }
    return { tags: result };
  };

  //   getStackDriftInformation = async (stackName: string): Promise<DriftDetail[]> => {
  //     let driftInformation: DescribeStackResourceDriftsCommandOutput;
  //     try {
  //       driftInformation = await this.#cloudformation().send(
  //         new DescribeStackResourceDriftsCommand({ StackName: stackName })
  //       );
  //     } catch {
  //       return null;
  //     }
  //     const driftedResources = driftInformation.StackResourceDrifts.filter(
  //       (resource) => resource.StackResourceDriftStatus !== 'IN_SYNC'
  //     );
  //     const res: DriftDetail[] = driftedResources.map((resource) => ({
  //       resourceLogicalName: resource.LogicalResourceId,
  //       resourceType: resource.ResourceType,
  //       differences: resource.PropertyDifferences
  //     }));
  //     validateStackDrift(res);

  //     return res;
  //   };

  invalidateCloudfrontDistributionCache = async ({
    distributionId,
    invalidatePaths
  }: {
    distributionId: string;
    invalidatePaths: string[];
  }) => {
    const errHandler = this.#getErrorHandler('Invalidation of CloudFront CDN cache has failed.');
    const {
      Invalidation: { Id }
    } = await this.#cloudfront()
      .send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `stacktape_invalidation${Date.now()}`,
            Paths: { Quantity: invalidatePaths.length, Items: invalidatePaths }
          }
        })
      )
      .catch(errHandler);
    await wait(1500);
    // just checking if invalidation exists (possibly still InProgress but we do not care)
    await this.#cloudfront()
      .send(new GetInvalidationCommand({ DistributionId: distributionId, Id }))
      .catch(errHandler);

    // while (Status !== 'Completed') {
    //   await wait(2000);
    //   ({
    //     Invalidation: { Status }
    //   } = await this.#cloudfront()
    //     .send(new GetInvalidationCommand({ DistributionId: distributionId, Id }))
    //     .catch(errHandler));
    // }
    return distributionId;
  };

  getCloudfrontDistributionForBucketName = async ({ bucketName }) => {
    const bucketDomainName = resourceURIs.bucket({ bucketName, region: this.region });
    const errHandler = this.#getErrorHandler('Failed to fetch CloudFront distribution ids.');

    const result: DistributionSummary[][] = [];

    let {
      DistributionList: { Items, NextMarker }
    } = await this.#cloudfront().send(new ListDistributionsCommand({})).catch(errHandler);
    result.push(Items);
    while (NextMarker) {
      ({
        DistributionList: { Items, NextMarker }
      } = await this.#cloudfront()
        .send(new ListDistributionsCommand({ Marker: NextMarker }))
        .catch(errHandler));
      result.push(Items);
    }

    return result.flat().filter((item) =>
      item?.Origins.Items.find((originItem) => {
        return originItem.DomainName === bucketDomainName;
      })
    );
  };

  listBudgets = async ({ accountId }: { accountId: string }) => {
    const errHandler = this.#getErrorHandler('Failed to list budgets in the account.');
    const result: Budget[][] = [];
    let { NextToken, Budgets } = await this.#budgets()
      .send(new DescribeBudgetsCommand({ AccountId: accountId }))
      .catch(errHandler);
    result.push(Budgets);
    while (NextToken) {
      ({ NextToken, Budgets } = await this.#budgets()
        .send(new DescribeBudgetsCommand({ AccountId: accountId, NextToken }))
        .catch(errHandler));
      result.push(Budgets);
    }
    return result.flat().filter((budget) => budget !== undefined);
  };

  getCodebuildProject = async ({ projectName }: { projectName: string }) => {
    const errHandler = this.#getErrorHandler(`Cannot retrieve information about codebuild project ${projectName}`);
    const result = await this.#codebuild()
      .send(new BatchGetProjectsCommand({ names: [projectName] }))
      .catch(errHandler);

    if ((result.projectsNotFound || []).includes(projectName)) {
      this.printer?.debug(`Codebuild project with name ${projectName} could not be found.`);
    }
    return result.projects?.[0];
  };

  createDummyCodebuildProject = async ({
    projectName,
    serviceRoleArn,
    logGroupName
  }: {
    projectName: string;
    serviceRoleArn: string;
    logGroupName: string;
  }) => {
    const errHandler = this.#getErrorHandler('Unable to create codebuild project.');
    const result = await this.#codebuild()
      .send(
        new CreateProjectCommand({
          artifacts: { type: ArtifactsType.NO_ARTIFACTS },
          name: projectName,
          environment: {
            computeType: ComputeType.BUILD_GENERAL1_MEDIUM,
            type: EnvironmentType.LINUX_CONTAINER,
            image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0' // 'aws/codebuild/standard:6.0'
          },
          serviceRole: serviceRoleArn,
          source: {
            type: SourceType.NO_SOURCE,
            buildspec: JSON.stringify({
              version: '0.2',
              env: {
                shell: 'bash'
              },
              phases: {
                install: {
                  'on-failure': 'ABORT',
                  commands: ['curl -L https://installs.stacktape.com/linux.sh | sh']
                },
                build: {
                  'on-failure': 'ABORT',
                  commands: ['/root/.stacktape/bin/stacktape help']
                }
              }
            })
          },
          logsConfig: {
            cloudWatchLogs: {
              status: 'ENABLED',
              groupName: logGroupName,
              streamName: 'test'
            }
          }
        })
      )
      .catch(errHandler);
    return result.project;
  };

  startCodebuildDelete = async ({
    codebuildProjectName,
    codebuildRoleArn,
    commandArgs,
    logGroupName,
    stackName,
    apiKeySsmParameterName,
    systemId,
    invocationId,
    useStacktapeVersion,
    codebuildBuildImage,
    stacktapeTrpcEndpoint
  }: {
    codebuildProjectName: string;
    codebuildRoleArn: string;
    commandArgs: StacktapeArgs;
    logGroupName: string;
    stackName: string;
    apiKeySsmParameterName: string;
    systemId: string;
    invocationId: string;
    useStacktapeVersion?: string;
    codebuildBuildImage?: string;
    stacktapeTrpcEndpoint?: string;
  }) => {
    const errHandler = this.#getErrorHandler('Failed to start codebuild deplete stack.');

    const bashInitiationFile = '/root/.local/bashrc';
    const poetryCodebuildInstallationPath = '/root/.local/bin';
    const stacktapeCodebuildInstallationPath = '/root/.stacktape/bin';

    const { build } = await this.#codebuild()
      .send(
        new StartBuildCommand({
          projectName: codebuildProjectName,
          sourceTypeOverride: SourceType.NO_SOURCE,
          environmentVariablesOverride: [
            {
              name: 'STACKTAPE_API_KEY',
              value: apiKeySsmParameterName,
              type: EnvironmentVariableType.PARAMETER_STORE
            },
            { name: 'STP_CODEBUILD', value: 'TRUE', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_INVOCATION_ID', value: invocationId, type: EnvironmentVariableType.PLAINTEXT },
            {
              name: 'STP_ORIGINAL_SYSTEM_ID',
              value: systemId,
              type: EnvironmentVariableType.PLAINTEXT
            },
            ...getOperationInvocationCodebuildEnvVariables(),
            {
              name: 'BASH_ENV',
              value: bashInitiationFile,
              type: EnvironmentVariableType.PLAINTEXT
            },
            ...(stacktapeTrpcEndpoint
              ? [
                  {
                    name: 'STP_CUSTOM_TRPC_API_ENDPOINT',
                    value: stacktapeTrpcEndpoint,
                    type: EnvironmentVariableType.PLAINTEXT
                  }
                ]
              : [])
          ],
          privilegedModeOverride: true,
          logsConfigOverride: {
            cloudWatchLogs: {
              status: 'ENABLED',
              groupName: logGroupName,
              streamName: `${stackName}/${kebabCase('deploy' as StacktapeCommand)}/${invocationId}`
            }
          },
          imageOverride: codebuildBuildImage || 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
          buildspecOverride: JSON.stringify({
            version: '0.2',
            env: {
              shell: 'bash'
            },
            phases: {
              install: {
                'on-failure': 'ABORT',
                commands: [
                  // "export STACKTAPE_VERSION" line must be deleted prior to releasing 2.0 production version. This ensures that the newest version is installed
                  // If you are testing runner deploys before a production release, specify the Stacktape version here.
                  ...(useStacktapeVersion ? [`export STACKTAPE_VERSION="${useStacktapeVersion}"`] : []),
                  'curl -L https://installs.stacktape.com/linux.sh | sh',
                  `echo "export PATH="${stacktapeCodebuildInstallationPath}:${poetryCodebuildInstallationPath}:\\$PATH"" >> ${bashInitiationFile}`,
                  `. ${bashInitiationFile}`,
                  `ASSUME_ROLE_ARN="${codebuildRoleArn}"`,
                  'TEMP_ROLE=$(aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name codebuild-deploy)',
                  'export TEMP_ROLE',

                  `export AWS_ACCESS_KEY_ID=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.AccessKeyId')`,

                  `export AWS_SECRET_ACCESS_KEY=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.SecretAccessKey')`,

                  `export AWS_SESSION_TOKEN=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.SessionToken')`,

                  `export EXPIRATION=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.Expiration')`
                ],
                finally: [`aws ssm delete-parameters --names "${apiKeySsmParameterName}"`]
              },
              build: {
                'on-failure': 'ABORT',
                commands: ['stacktape delete '.concat(transformToCliArgs(commandArgs).join(' '))]
              }
            }
          })
        })
      )
      .catch(errHandler);
    return build;
  };

  startCodebuildDeployment = async ({
    codebuildProjectName,
    // codebuildRoleArn,
    projectZipBucketName,
    projectZipS3Key,
    commandArgs,
    logGroupName,
    gitInfo,
    stackName,
    apiKeySsmParameterName,
    systemId,
    invocationId,
    useStacktapeVersion,
    codebuildBuildImage,
    additionalBuildCommands = [],
    additionalInstallCommands = [],
    stacktapeTrpcEndpoint,
    computeTypeOverride
  }: {
    codebuildProjectName: string;
    codebuildRoleArn: string;
    projectZipBucketName: string;
    projectZipS3Key: string;
    commandArgs: StacktapeArgs;
    logGroupName: string;
    gitInfo: GitInformation;
    stackName: string;
    apiKeySsmParameterName: string;
    systemId: string;
    invocationId: string;
    useStacktapeVersion?: string;
    additionalBuildCommands?: string[];
    additionalInstallCommands?: string[];
    computeTypeOverride?: ComputeType;
    codebuildBuildImage?: string;
    stacktapeTrpcEndpoint?: string;
  }) => {
    const errHandler = this.#getErrorHandler('Failure when starting codebuild deployment.');

    const bashInitiationFile = '/root/.local/bashrc';
    const poetryCodebuildInstallationPath = '/root/.local/bin';
    const stacktapeCodebuildInstallationPath = '/root/.stacktape/bin';
    const pnpmHome = '/root/.local/share/pnpm';
    const bunHome = '/root/.bun/bin';

    const { build } = await this.#codebuild()
      .send(
        new StartBuildCommand({
          projectName: codebuildProjectName,
          sourceTypeOverride: SourceType.S3,
          sourceLocationOverride: `${projectZipBucketName}/${projectZipS3Key}`,
          environmentVariablesOverride: [
            {
              name: 'STACKTAPE_API_KEY',
              value: apiKeySsmParameterName,
              type: EnvironmentVariableType.PARAMETER_STORE
            },
            { name: 'STP_CODEBUILD', value: 'TRUE', type: EnvironmentVariableType.PLAINTEXT },

            { name: 'STP_GIT_USER_NAME', value: gitInfo.username || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_BRANCH_NAME', value: gitInfo.branch || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_COMMIT_SHA', value: gitInfo.commit || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_URL', value: gitInfo.gitUrl || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_INVOCATION_ID', value: invocationId, type: EnvironmentVariableType.PLAINTEXT },
            {
              name: 'STP_ORIGINAL_SYSTEM_ID',
              value: systemId,
              type: EnvironmentVariableType.PLAINTEXT
            },
            ...getOperationInvocationCodebuildEnvVariables(),
            {
              name: 'BASH_ENV',
              value: bashInitiationFile,
              type: EnvironmentVariableType.PLAINTEXT
            },
            ...(stacktapeTrpcEndpoint
              ? [
                  {
                    name: 'STP_CUSTOM_TRPC_API_ENDPOINT',
                    value: stacktapeTrpcEndpoint,
                    type: EnvironmentVariableType.PLAINTEXT
                  }
                ]
              : [])
          ],
          privilegedModeOverride: true,
          logsConfigOverride: {
            cloudWatchLogs: {
              status: 'ENABLED',
              groupName: logGroupName,
              streamName: `${stackName}/${kebabCase('deploy' as StacktapeCommand)}/${invocationId}`
            }
          },
          ...(computeTypeOverride ? { computeTypeOverride } : {}),
          imageOverride: codebuildBuildImage || 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
          buildspecOverride: JSON.stringify({
            version: '0.2',
            env: {
              shell: 'bash'
            },
            phases: {
              install: {
                'on-failure': 'RETRY-2', // will retry up to 3 times
                commands: [
                  // track attempt count
                  'if [ -z "${CODEBUILD_ATTEMPT+x}" ]; then export CODEBUILD_ATTEMPT=1; else CODEBUILD_ATTEMPT=$((CODEBUILD_ATTEMPT+1)); export CODEBUILD_ATTEMPT; fi',
                  'echo "Install Phase - Attempt #${CODEBUILD_ATTEMPT}"',
                  'docker run --privileged --rm public.ecr.aws/vend/tonistiigi/binfmt:latest --install arm64',
                  ...additionalInstallCommands,
                  'yum install -y libatomic',
                  'curl -fsSL https://get.pnpm.io/install.sh | sh -',
                  'curl -fsSL https://bun.sh/install | bash',
                  ...(useStacktapeVersion ? [`export STACKTAPE_VERSION="${useStacktapeVersion}"`] : []),
                  'curl -L https://installs.stacktape.com/linux.sh | sh',
                  `echo "export PATH="${stacktapeCodebuildInstallationPath}:${poetryCodebuildInstallationPath}:${pnpmHome}:${bunHome}:\\$PATH"" >> ${bashInitiationFile}`,
                  `. ${bashInitiationFile}`
                  // `ASSUME_ROLE_ARN="${codebuildRoleArn}"`,
                  // 'TEMP_ROLE=$(aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name codebuild-deploy)',
                  // 'export TEMP_ROLE',
                  // // eslint-disable-next-line quotes
                  // `export AWS_ACCESS_KEY_ID=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.AccessKeyId')`,
                  // // eslint-disable-next-line quotes
                  // `export AWS_SECRET_ACCESS_KEY=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.SecretAccessKey')`,
                  // // eslint-disable-next-line quotes
                  // `export AWS_SESSION_TOKEN=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.SessionToken')`,
                  // // eslint-disable-next-line quotes
                  // `export EXPIRATION=$(echo "\${TEMP_ROLE}" | jq -r '.Credentials.Expiration')`
                ],
                finally: [
                  'if [ "$CODEBUILD_ATTEMPT" -ge 3 ] || [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then ' +
                    `  echo "Running cleanup…"; aws ssm delete-parameters --names "${apiKeySsmParameterName}"; ` +
                    'else ' +
                    '  echo "Install failed on attempt #${CODEBUILD_ATTEMPT}, sleeping 10s before retry…"; ' +
                    '  sleep 10; ' +
                    'fi'
                ]
              },
              build: {
                'on-failure': 'ABORT',
                commands: [
                  'if [ -f package.json ] && [ ! -d node_modules ]; then ' +
                    'if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; ' +
                    'elif [ -f yarn.lock ] && [ -f .yarnrc.yml ]; then corepack yarn install --immutable; ' +
                    'elif [ -f yarn.lock ]; then corepack yarn install --frozen-lockfile; ' +
                    'elif [ -f bun.lock ] || [ -f bun.lockb ]; then bun install --frozen-lockfile; ' +
                    'elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; ' +
                    'else npm install; fi; fi',
                  ...additionalBuildCommands,
                  'stacktape deploy '.concat(transformToCliArgs(commandArgs).join(' '))
                ]
              }
            }
          })
        })
      )
      .catch(errHandler);
    return build;
  };

  getCodebuildDeployment = async ({ buildId }: { buildId: string }) => {
    const errHandler = this.#getErrorHandler(`Error getting codebuild deployment with buildId ${buildId}.`);
    const build = (
      await this.#codebuild()
        .send(new BatchGetBuildsCommand({ ids: [buildId] }))
        .catch(errHandler)
    ).builds.at(0);
    return build;
  };

  getCodebuildBuilds = async ({ buildIds }: { buildIds: string[] }) => {
    const errHandler = this.#getErrorHandler('Error getting codebuild builds.');
    const { builds } = await this.#codebuild()
      .send(new BatchGetBuildsCommand({ ids: buildIds }))
      .catch(errHandler);
    return builds;
  };

  waitForCodebuildDeploymentToReachBuildPhase = async ({
    buildId,
    awsAccountId
  }: {
    buildId: string;
    awsAccountId: string;
  }) => {
    const errHandler = this.#getErrorHandler(
      `Codebuild deployment with buildId ${buildId} failed to reach desired state.`
    );
    const failureStatusTypes = [
      StatusType.FAILED,
      StatusType.FAULT,
      StatusType.STOPPED,
      StatusType.TIMED_OUT,
      'CLIENT_ERROR'
    ];
    const waiterInput: BatchGetBuildsCommandInput = { ids: [buildId] };
    const waiterResult = await createWaiter(
      { client: this.#codebuild(), maxWaitTime: 1500, minDelay: 1, maxDelay: 1 },
      waiterInput,
      async (codebuildCli, input) => {
        const {
          builds: [build]
        } = await codebuildCli.send(new BatchGetBuildsCommand(input));
        // this waiter conditions are motivated by https://github.com/aws/aws-cdk/blob/450f7ca695f5f0bab758c31f3fd8390649adce51/packages/aws-cdk/lib/api/hotswap/ecs-services.ts#L129
        if (failureStatusTypes.includes(build.buildStatus as StatusType)) {
          // if entire build failed, the last phase should also be failed (and the cause of failure)
          const lastPhase = build.phases.find(({ phaseStatus }) =>
            failureStatusTypes.includes(phaseStatus as StatusType)
          );
          const additionalMessage = (lastPhase.contexts || [])
            .map(({ statusCode, message }) => `[Status code ${statusCode}]: ${message}`)
            .join('\n');
          throw new CliError({
            category: 'CODEBUILD',
            code: 'CODEBUILD_START_FAILED',
            message: `Start of codebuild deployment failed in phase "${
              lastPhase.phaseType
            }" with status before stacktape operation could be started.${
              additionalMessage ? `\nAdditional message: ${additionalMessage}.` : ''
            }`,
            hints: `Deployment logs: ${consoleLinks.codebuildDeployment(
              this.region,
              awsAccountId,
              build.projectName,
              buildId
            )}`
          });
        }

        const buildPhaseStarted = build.phases.find(({ phaseType }) => phaseType === BuildPhaseType.BUILD);

        if (buildPhaseStarted) {
          return {
            state: WaiterState.SUCCESS,
            reason: `Build successfully reached "${BuildPhaseType.BUILD}" phase`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: 'Build in progress'
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errHandler(new Error(waiterResult.reason));
    }
  };

  getEc2InstanceTypesInfo = async ({ instanceTypes }: { instanceTypes: _InstanceType[] }) => {
    const errHandler = this.#getErrorHandler('Could not list EC2 instance types.');
    const result: InstanceTypeInfo[] = [];
    let { InstanceTypes, NextToken } = await this.#ec2()
      .send(new DescribeInstanceTypesCommand({ InstanceTypes: instanceTypes }))
      .catch(errHandler);
    result.push(...(InstanceTypes || []));
    while (NextToken) {
      ({ InstanceTypes, NextToken } = await this.#ec2()
        .send(new DescribeInstanceTypesCommand({ InstanceTypes: instanceTypes, NextToken }))
        .catch(errHandler));
      result.push(...(InstanceTypes || []));
    }
    return result;
  };

  describeSubnets = async (params: { subnetIds?: string[]; vpcId?: string }): Promise<Subnet[]> => {
    const errHandler = this.#getErrorHandler('Could not describe subnets.');

    const filters = params.vpcId ? [{ Name: 'vpc-id', Values: [params.vpcId] }] : undefined;

    const result = await this.#ec2()
      .send(
        new DescribeSubnetsCommand({
          SubnetIds: params.subnetIds,
          Filters: filters
        })
      )
      .catch(errHandler);

    return result.Subnets || [];
  };

  describeRouteTables = async (vpcId: string): Promise<RouteTable[]> => {
    const errHandler = this.#getErrorHandler('Could not describe route tables.');

    const result = await this.#ec2()
      .send(
        new DescribeRouteTablesCommand({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }]
        })
      )
      .catch(errHandler);

    return result.RouteTables || [];
  };

  describeVpcs = async (vpcIds: string[]): Promise<Vpc[]> => {
    const errHandler = this.#getErrorHandler('Could not describe VPCs.');

    const result = await this.#ec2()
      .send(
        new DescribeVpcsCommand({
          VpcIds: vpcIds
        })
      )
      .catch(errHandler);

    return result.Vpcs || [];
  };

  startSsmSession = async (startSessionInput: StartSessionCommandInput) => {
    const errHandler = this.#getErrorHandler('Unable to start SSM session');
    const { SessionId, StreamUrl, TokenValue } = await this.#ssm()
      .send(new StartSessionCommand(startSessionInput))
      .catch(errHandler);
    return { SessionId, StreamUrl, TokenValue } as StartSessionResponse;
  };

  terminateSsmSession = async ({ sessionId }: { sessionId: string }) => {
    const errHandler = this.#getErrorHandler('Unable to terminate SSM session');
    await this.#ssm()
      .send(new TerminateSessionCommand({ SessionId: sessionId }))
      .catch(errHandler);
  };

  startSsmShellScript = async ({
    instanceId,
    commands,
    cwd = '/'
  }: {
    instanceId: string;
    commands: string[];
    cwd?: string;
  }) => {
    const errHandler = this.#getErrorHandler(`Unable to start shell script on instance ${instanceId}`);
    return this.#ssm()
      .send(
        new SendCommandCommand({
          DocumentName: 'AWS-RunShellScript',
          InstanceIds: [instanceId],
          Parameters: { commands, workingDirectory: [cwd] },
          CloudWatchOutputConfig: { CloudWatchOutputEnabled: true }
        })
      )
      .catch(errHandler);
  };

  getSsmShellScriptExecution = async ({ instanceId, commandId }: { instanceId: string; commandId: string }) => {
    const errHandler = this.#getErrorHandler(
      `Error when fetching information about shell script execution on instance ${instanceId}`
    );
    const {
      CommandInvocations: [commandInvocationInfo]
    } = await this.#ssm()
      .send(
        new ListCommandInvocationsCommand({
          CommandId: commandId,
          InstanceId: instanceId
        })
      )
      .catch(errHandler);
    return commandInvocationInfo;
  };

  getAutoscalingGroupInfo = async ({ autoscalingGroupAwsName }: { autoscalingGroupAwsName: string }) => {
    const errHandler = this.#getErrorHandler(
      `Unable to get information for autoscaling group ${autoscalingGroupAwsName}`
    );
    const result = await this.#ec2AutoScaling()
      .send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [autoscalingGroupAwsName] }))
      .catch(errHandler);
    return result.AutoScalingGroups[0];
  };

  getOpenSearchInstanceTypeLimits = async ({
    instanceType,
    openSearchVersion
  }: {
    instanceType: OpenSearchPartitionInstanceType;
    openSearchVersion: string;
  }) => {
    return this.#openSearch().send(
      new DescribeInstanceTypeLimitsCommand({
        InstanceType: instanceType,
        EngineVersion: `OpenSearch_${openSearchVersion}`
      })
    );
  };

  getRdsInstanceDetail = async ({ rdsInstanceIdentifier }: { rdsInstanceIdentifier: string }) => {
    const errHandler = this.#getErrorHandler('Unable to get RDS DB instance detail');
    const response = await this.#rds()
      .send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: rdsInstanceIdentifier }))
      .catch(errHandler);
    return response.DBInstances?.[0];
  };

  getRdsClusterDetail = async ({ rdsClusterIdentifier }: { rdsClusterIdentifier: string }) => {
    const errHandler = this.#getErrorHandler('Unable to get RDS cluster detail');
    const response = await this.#rds()
      .send(new DescribeDBClustersCommand({ DBClusterIdentifier: rdsClusterIdentifier }))
      .catch(errHandler);
    return response.DBClusters?.[0];
  };
}
