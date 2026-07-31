import type { TuiManager as Printer } from '@application-services/tui-manager';
import type { CostExplorerTagsError } from '@domain-services/budget-manager/types';
import type { Budget } from '@aws-sdk/client-budgets';
import type { DistributionSummary } from '@aws-sdk/client-cloudfront';
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
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
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
import { resourceURIs } from 'src/utils/aws-resource-uris';
import { wait } from '@utils/misc';
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
import { AwsCodeBuild } from '../codebuild';
import { defaultGetErrorFunction } from './utils';

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
  #codeBuild?: AwsCodeBuild;
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
    this.#codeBuild = new AwsCodeBuild({
      createClient: () => this.#codeBuildClient(),
      getErrorHandler: this.#getErrorHandler,
      printer,
      region
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

  get codeBuild() {
    this.#getContext();
    if (!this.#codeBuild) {
      throw new Error('AWS CodeBuild has not been initialized.');
    }
    return this.#codeBuild;
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

  #codeBuildClient() {
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
