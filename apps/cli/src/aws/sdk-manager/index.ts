import type { TuiManager as Printer } from '@application-services/tui-manager';
import { ACMClient } from '@aws-sdk/client-acm';
import { AutoScaling } from '@aws-sdk/client-auto-scaling';
import { BudgetsClient } from '@aws-sdk/client-budgets';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { EC2Client } from '@aws-sdk/client-ec2';
import { ECRClient } from '@aws-sdk/client-ecr';
import { ECSClient } from '@aws-sdk/client-ecs';
import { IAMClient } from '@aws-sdk/client-iam';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { OpenSearchClient } from '@aws-sdk/client-opensearch';
import { RDSClient } from '@aws-sdk/client-rds';
import { ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import { Route53Client } from '@aws-sdk/client-route-53';
import { Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import { S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SESClient } from '@aws-sdk/client-ses';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SSMClient } from '@aws-sdk/client-ssm';
import { STSClient } from '@aws-sdk/client-sts';
// import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
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
import { AwsSystemsManager } from '../systems-manager';
import { AwsCostManagement } from '../cost-management';
import { AwsCloudFront } from '../cloudfront';
import { AwsEc2 } from '../ec2';
import { AwsAutoScaling } from '../auto-scaling';
import { AwsOpenSearch } from '../open-search';
import { AwsRds } from '../rds';
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
  #systemsManager?: AwsSystemsManager;
  #costManagement?: AwsCostManagement;
  #cloudFront?: AwsCloudFront;
  #ec2?: AwsEc2;
  #autoScaling?: AwsAutoScaling;
  #openSearch?: AwsOpenSearch;
  #rds?: AwsRds;
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
    this.#systemsManager = new AwsSystemsManager({
      createClient: () => this.#ssm(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#costManagement = new AwsCostManagement({
      createBudgetsClient: () => this.#budgets(),
      createCostExplorerClient: () => this.#costExplorer(),
      createResourceTaggingClient: () => this.#resourceGroupsTaggingApi(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#cloudFront = new AwsCloudFront({
      createClient: () => this.#cloudfront(),
      getErrorHandler: this.#getErrorHandler,
      region,
      wait
    });
    this.#ec2 = new AwsEc2({
      createClient: () => this.#ec2Client(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#autoScaling = new AwsAutoScaling({
      createClient: () => this.#autoScalingClient(),
      getErrorHandler: this.#getErrorHandler
    });
    this.#openSearch = new AwsOpenSearch({ createClient: () => this.#openSearchClient() });
    this.#rds = new AwsRds({
      createClient: () => this.#rdsClient(),
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

  get codeBuild() {
    this.#getContext();
    if (!this.#codeBuild) {
      throw new Error('AWS CodeBuild has not been initialized.');
    }
    return this.#codeBuild;
  }

  get systemsManager() {
    this.#getContext();
    if (!this.#systemsManager) {
      throw new Error('AWS Systems Manager has not been initialized.');
    }
    return this.#systemsManager;
  }

  get costManagement() {
    this.#getContext();
    if (!this.#costManagement) {
      throw new Error('AWS cost management services have not been initialized.');
    }
    return this.#costManagement;
  }

  get cloudFront() {
    this.#getContext();
    if (!this.#cloudFront) {
      throw new Error('AWS CloudFront has not been initialized.');
    }
    return this.#cloudFront;
  }

  get ec2() {
    this.#getContext();
    if (!this.#ec2) {
      throw new Error('AWS EC2 has not been initialized.');
    }
    return this.#ec2;
  }

  get autoScaling() {
    this.#getContext();
    if (!this.#autoScaling) {
      throw new Error('AWS Auto Scaling has not been initialized.');
    }
    return this.#autoScaling;
  }

  get openSearch() {
    this.#getContext();
    if (!this.#openSearch) {
      throw new Error('AWS OpenSearch has not been initialized.');
    }
    return this.#openSearch;
  }

  get rds() {
    this.#getContext();
    if (!this.#rds) {
      throw new Error('AWS RDS has not been initialized.');
    }
    return this.#rds;
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

  #ec2Client() {
    return this.#applyPlugins(new EC2Client(this.#getClientArgs()));
  }

  #autoScalingClient() {
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

  #rdsClient() {
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

  #openSearchClient() {
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
}
