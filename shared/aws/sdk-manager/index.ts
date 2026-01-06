import type { CertificateStatus, ResourceRecord } from '@aws-sdk/client-acm';
import type { Budget } from '@aws-sdk/client-budgets';
import type {
  CreateChangeSetInput,
  CreateStackInput,
  ListStackResourcesCommandOutput,
  SetStackPolicyInput,
  Stack,
  StackEvent,
  StackResourceSummary,
  StackSummary,
  TypeSummary,
  TypeVersionSummary,
  UpdateStackInput
} from '@aws-sdk/client-cloudformation';
import type { DistributionSummary } from '@aws-sdk/client-cloudfront';
import type { FilteredLogEvent, InputLogEvent, OrderBy } from '@aws-sdk/client-cloudwatch-logs';
import type { BatchGetBuildsCommandInput, Build } from '@aws-sdk/client-codebuild';
import type { CreateDeploymentCommandInput } from '@aws-sdk/client-codedeploy';
import type { UserType } from '@aws-sdk/client-cognito-identity-provider';
import type { Tag } from '@aws-sdk/client-dynamodb';
import type { _InstanceType, InstanceTypeInfo, RouteTable, Subnet, Vpc } from '@aws-sdk/client-ec2';
import type { ImageIdentifier } from '@aws-sdk/client-ecr';
import type {
  DescribeServicesCommandInput,
  DesiredStatus,
  ExecuteCommandCommandInput,
  UpdateServiceCommandInput
} from '@aws-sdk/client-ecs';
import type { GetRoleCommandOutput } from '@aws-sdk/client-iam';
import type { OpenSearchPartitionInstanceType } from '@aws-sdk/client-opensearch';
import type { HostedZone, ResourceRecordSet } from '@aws-sdk/client-route-53';
import type { DomainPrice } from '@aws-sdk/client-route-53-domains';
import type { _Object, ObjectIdentifier, ObjectVersion } from '@aws-sdk/client-s3';
import type { SecretListEntry } from '@aws-sdk/client-secrets-manager';
import type { StartSessionCommandInput, StartSessionResponse } from '@aws-sdk/client-ssm';
import type { Credentials, Pluggable } from '@aws-sdk/types';
import type TaskDefinition from '@cloudform/ecs/taskDefinition';
import type { Policy } from '@cloudform/iam/role';
import type { Stats } from 'node:fs';
import type { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { Agent as HttpsAgent } from 'node:https';
import path from 'node:path';
import {
  ACMClient,
  DescribeCertificateCommand,
  ListCertificatesCommand,
  ListTagsForCertificateCommand,
  RequestCertificateCommand
} from '@aws-sdk/client-acm';
import { AutoScaling, DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import { BudgetsClient, DescribeBudgetsCommand } from '@aws-sdk/client-budgets';
import {
  CancelUpdateStackCommand,
  CloudFormationClient,
  ContinueUpdateRollbackCommand,
  CreateChangeSetCommand,
  CreateStackCommand,
  DeleteStackCommand,
  DeregisterTypeCommand,
  DescribeChangeSetCommand,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  DescribeTypeRegistrationCommand,
  ExecuteChangeSetCommand,
  GetTemplateCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  ListTypesCommand,
  ListTypeVersionsCommand,
  RegisterTypeCommand,
  RollbackStackCommand,
  SetStackPolicyCommand,
  SetTypeDefaultVersionCommand,
  UpdateStackCommand,
  UpdateTerminationProtectionCommand,
  ValidateTemplateCommand
} from '@aws-sdk/client-cloudformation';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListDistributionsCommand
} from '@aws-sdk/client-cloudfront';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  PutLogEventsCommand,
  PutRetentionPolicyCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-cloudwatch-logs';
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
  ListBuildsForProjectCommand,
  SourceType,
  StartBuildCommand,
  StatusType
} from '@aws-sdk/client-codebuild';
import { CodeDeployClient, CreateDeploymentCommand, waitUntilDeploymentSuccessful } from '@aws-sdk/client-codedeploy';
import {
  AdminConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { CostExplorerClient, GetTagsCommand } from '@aws-sdk/client-cost-explorer';
import { DescribeTableCommand, DynamoDBClient, TagResourceCommand as TagDynamoTable } from '@aws-sdk/client-dynamodb';
import {
  DescribeInstanceTypesCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  EC2Client
} from '@aws-sdk/client-ec2';
import {
  BatchDeleteImageCommand,
  DescribeRepositoriesCommand,
  ECRClient,
  GetAuthorizationTokenCommand,
  ListImagesCommand
} from '@aws-sdk/client-ecr';
import {
  DeploymentRolloutState,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ExecuteCommandCommand,
  ListTasksCommand,
  PutAccountSettingDefaultCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand
} from '@aws-sdk/client-ecs';
import {
  AttachRolePolicyCommand,
  CreateRoleCommand,
  DeleteRolePolicyCommand,
  GetRoleCommand,
  IAMClient,
  ListRolePoliciesCommand,
  MalformedPolicyDocumentException,
  NoSuchEntityException,
  PutRolePolicyCommand,
  UpdateAssumeRolePolicyCommand,
  waitUntilPolicyExists,
  waitUntilRoleExists
} from '@aws-sdk/client-iam';
import {
  GetFunctionConfigurationCommand,
  InvokeCommand,
  LambdaClient,
  ListTagsCommand,
  PublishVersionCommand,
  TagResourceCommand as TagLambdaResource,
  UpdateAliasCommand,
  UpdateFunctionCodeCommand,
  waitUntilFunctionUpdated
} from '@aws-sdk/client-lambda';
import { DescribeInstanceTypeLimitsCommand, OpenSearchClient } from '@aws-sdk/client-opensearch';
import { DescribeDBClustersCommand, DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds';
import { GetTagKeysCommand, ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import {
  ChangeResourceRecordSetsCommand,
  CreateHostedZoneCommand,
  GetHostedZoneCommand,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  Route53Client
} from '@aws-sdk/client-route-53';
import { ListPricesCommand, Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketAccelerateConfigurationCommand,
  PutBucketEncryptionCommand,
  PutBucketPolicyCommand,
  S3Client,
  S3ServiceException,
  waitUntilBucketExists
} from '@aws-sdk/client-s3';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
  UpdateSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { GetIdentityVerificationAttributesCommand, SESClient, VerifyDomainDkimCommand } from '@aws-sdk/client-ses';
import { GetAccountCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersCommand,
  ListCommandInvocationsCommand,
  ParameterNotFound,
  ParameterType,
  PutParameterCommand,
  SendCommandCommand,
  SSMClient,
  StartSessionCommand,
  TerminateSessionCommand
} from '@aws-sdk/client-ssm';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { Upload } from '@aws-sdk/lib-storage';
// import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node';
import { createWaiter, WaiterState } from '@aws-sdk/util-waiter';
import { consoleLinks } from '@shared/naming/console-links';
import { resourceURIs } from '@shared/naming/resource-uris';
import { COMMENT_FOR_STACKTAPE_ZONE } from '@shared/utils/constants';
import { getRelativePath } from '@shared/utils/fs-utils';
import {
  chunkArray,
  getError,
  lowerCaseFirstCharacterOfObjectKeys,
  raiseError,
  serialize,
  streamToString,
  stringMatchesGlob,
  wait
} from '@shared/utils/misc';
import { parseYaml } from '@shared/utils/yaml';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { kebabCase, pascalCase } from 'change-case';
import fsExtra from 'fs-extra';
import pRetry from 'p-retry';
import { S3Sync } from '../s3-sync';
import {
  automaticUploadFilterPresets,
  defaultGetErrorFunction,
  isBucketNativelySupportedHeader,
  redirectPlugin,
  retryPlugin,
  transformToCliArgs
} from './utils';

type S3SyncInfo = {
  progressPercent: number | string;
  activeTransfers: number;
  progressAmount: number;
  progressTotal: number;
  progressMd5Amount: number;
  progressMd5Total: number;
  objectsFound: number;
  filesFound: number;
  deleteAmount: number;
  deleteTotal: number;
};

export class AwsSdkManager {
  credentials: AwsCredentials;
  region: AWSRegion;
  plugins: Pluggable<any, any>[] = [];
  printer?: Printer;
  #getErrorHandler: (message: string) => (err: Error) => never;

  init({
    credentials,
    region,
    plugins,
    getErrorHandlerFn,
    printer
  }: {
    credentials: AwsCredentials;
    region: AWSRegion;
    plugins?: Pluggable<any, any>[];
    getErrorHandlerFn?: (message: string) => (err: Error) => never;
    printer?: Printer | undefined;
  }) {
    this.credentials = credentials;
    this.region = region;
    this.plugins = plugins || [redirectPlugin, retryPlugin];
    this.#getErrorHandler = getErrorHandlerFn || defaultGetErrorFunction;
    this.printer = printer;
  }

  get isInitialized() {
    return !!this.credentials;
  }

  #getClientArgs() {
    // default keep-alive off (safe)
    const httpsAgent = new HttpsAgent({ keepAlive: false });
    return {
      region: this.region,
      credentials: this.credentials,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 10000,
        socketTimeout: 20000,
        httpsAgent
      })
    };
  }

  #iam() {
    const iam = new IAMClient(this.#getClientArgs());
    this.plugins.forEach(iam.middlewareStack.use);
    return iam;
  }

  #secretsManager() {
    const secretsManager = new SecretsManagerClient(this.#getClientArgs());
    this.plugins.forEach(secretsManager.middlewareStack.use);
    return secretsManager;
  }

  #ssm() {
    const ssmManager = new SSMClient(this.#getClientArgs());
    this.plugins.forEach(ssmManager.middlewareStack.use);
    return ssmManager;
  }

  #cognito() {
    const cognito = new CognitoIdentityProviderClient(this.#getClientArgs());
    this.plugins.forEach(cognito.middlewareStack.use);
    return cognito;
  }

  #cloudformation() {
    // for CF only, ensure fresh sockets (keepAlive false)
    const cfAgent = new HttpsAgent({ keepAlive: false });
    const cloudformation = new CloudFormationClient({
      ...this.#getClientArgs(),
      apiVersion: '2015-07-09',
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 10000,
        socketTimeout: 20000,
        httpsAgent: cfAgent
      })
    });
    this.plugins.forEach(cloudformation.middlewareStack.use);
    return cloudformation;
  }

  #codedeploy() {
    const codeDeploy = new CodeDeployClient({ ...this.#getClientArgs() });
    this.plugins.forEach(codeDeploy.middlewareStack.use);
    return codeDeploy;
  }

  #codebuild() {
    const codeBuild = new CodeBuildClient({ ...this.#getClientArgs() });
    this.plugins.forEach(codeBuild.middlewareStack.use);
    return codeBuild;
  }

  #cloudfront() {
    const cloudfront = new CloudFrontClient(this.#getClientArgs());
    this.plugins.forEach(cloudfront.middlewareStack.use);
    return cloudfront;
  }

  #usEast1Acm() {
    const usEast1Acm = new ACMClient({ ...this.#getClientArgs(), region: 'us-east-1' });
    this.plugins.forEach(usEast1Acm.middlewareStack.use);
    return usEast1Acm;
  }

  #acceleratedS3() {
    const acceleratedS3Client = new S3Client({
      ...this.#getClientArgs(),
      endpoint: 'https://s3-accelerate.amazonaws.com'
    });
    this.plugins.forEach(acceleratedS3Client.middlewareStack.use);
    return acceleratedS3Client;
  }

  #syncS3() {
    return new S3Sync({
      s3RetryCount: 5,
      clientArgs: this.#getClientArgs(),
      s3Plugins: this.plugins
    });
  }

  #acceleratedSyncS3() {
    return new S3Sync({
      s3RetryCount: 5,
      clientArgs: { ...this.#getClientArgs(), endpoint: 'https://s3-accelerate.amazonaws.com' },
      s3Plugins: this.plugins
    });
  }

  #acm() {
    const acm = new ACMClient({ ...this.#getClientArgs() });
    this.plugins.forEach(acm.middlewareStack.use);
    return acm;
  }

  #dynamo() {
    const dynamoClient = new DynamoDBClient({ ...this.#getClientArgs() });
    this.plugins.forEach(dynamoClient.middlewareStack.use);
    return dynamoClient;
  }

  #route53() {
    const route53 = new Route53Client(this.#getClientArgs());
    this.plugins.forEach(route53.middlewareStack.use);
    return route53;
  }

  #route53Domains() {
    const route53 = new Route53DomainsClient({ ...this.#getClientArgs(), region: 'us-east-1' });
    this.plugins.forEach(route53.middlewareStack.use);
    return route53;
  }

  #sts() {
    const sts = new STSClient(this.#getClientArgs());
    this.plugins.forEach(sts.middlewareStack.use);
    return sts;
  }

  #ecr() {
    const ecr = new ECRClient({ ...this.#getClientArgs() });
    this.plugins.forEach(ecr.middlewareStack.use);
    return ecr;
  }

  #ecs() {
    const ecs = new ECSClient({ ...this.#getClientArgs() });
    this.plugins.forEach((plugin) => ecs.middlewareStack.use(plugin as any));
    return ecs;
  }

  #ec2() {
    const ec2 = new EC2Client({ ...this.#getClientArgs() });
    this.plugins.forEach(ec2.middlewareStack.use);
    return ec2;
  }

  #ec2AutoScaling() {
    const ec2AutoScaling = new AutoScaling({ ...this.#getClientArgs() });
    this.plugins.forEach(ec2AutoScaling.middlewareStack.use);
    return ec2AutoScaling;
  }

  #ses() {
    const ses = new SESClient({ ...this.#getClientArgs() });
    this.plugins.forEach(ses.middlewareStack.use);
    return ses;
  }

  // note: we need both ses and sesv2 client because at the time of writing their methods do not overlap
  #sesv2() {
    const sesv2 = new SESv2Client({ ...this.#getClientArgs() });
    this.plugins.forEach(sesv2.middlewareStack.use);
    return sesv2;
  }

  #s3() {
    const s3 = new S3Client({ ...this.#getClientArgs() });
    this.plugins.forEach(s3.middlewareStack.use);
    return s3;
  }

  #rds() {
    const rds = new RDSClient({ ...this.#getClientArgs() });
    this.plugins.forEach(rds.middlewareStack.use);
    return rds;
  }

  #cloudwatchLogs() {
    const cloudWatchLogs = new CloudWatchLogsClient(this.#getClientArgs());
    this.plugins.forEach(cloudWatchLogs.middlewareStack.use);
    return cloudWatchLogs;
  }

  #lambda() {
    const lambda = new LambdaClient({
      // In order to honor the overall maximum timeout set for the target process when invoking lambda,
      // the default 2 minutes from AWS SDK has to be overridden
      requestHandler: new NodeHttpHandler({ socketTimeout: 900000 }),
      ...this.#getClientArgs()
    });
    this.plugins.forEach(lambda.middlewareStack.use);
    return lambda;
  }

  #openSearch() {
    const openSearch = new OpenSearchClient(this.#getClientArgs());
    this.plugins.forEach(openSearch.middlewareStack.use);
    return openSearch;
  }

  #resourceGroupsTaggingApi() {
    const taggingApi = new ResourceGroupsTaggingAPIClient(this.#getClientArgs());
    this.plugins.forEach(taggingApi.middlewareStack.use);
    return taggingApi;
  }

  #costExplorer() {
    const costExplorer = new CostExplorerClient(this.#getClientArgs());
    this.plugins.forEach(costExplorer.middlewareStack.use);
    return costExplorer;
  }

  #budgets() {
    const budgets = new BudgetsClient(this.#getClientArgs());
    this.plugins.forEach(budgets.middlewareStack.use);
    return budgets;
  }

  validateCloudformationTemplate = ({ templateBody, templateUrl }: { templateUrl?: string; templateBody?: string }) => {
    return this.#cloudformation()
      .send(
        new ValidateTemplateCommand({
          ...(templateUrl && { TemplateURL: templateUrl }),
          ...(templateBody && { TemplateBody: templateBody })
        })
      )
      .catch((err) => {
        raiseError({
          type: 'CLOUDFORMATION',
          message: `Template validation error:\nCode: ${err.code}\nMessage: ${err.message}`
        });
      });
  };

  createStack = (template: CloudformationTemplate, stackParams: CreateStackInput) => {
    const errHandler = this.#getErrorHandler('Failed to initiate stack creation.');
    return this.#cloudformation()
      .send(new CreateStackCommand({ ...stackParams, TemplateBody: JSON.stringify(template) }))
      .catch(errHandler);
  };

  updateStack = (templateUrl: string, stackParams: UpdateStackInput) => {
    const errHandler = this.#getErrorHandler('Failed to initiate stack update.');
    return this.#cloudformation()
      .send(new UpdateStackCommand({ ...stackParams, TemplateURL: templateUrl }))
      .then((result) => ({
        ...result,
        skipped: false
      }))
      .catch((err) => {
        if (err.message === 'No updates are to be performed.') {
          return { skipped: true };
        }
        errHandler(err);
      });
  };

  cancelUpdateStack = (stackName: string) => {
    const errHandler = this.#getErrorHandler('Failed to cancel update stack.');
    return this.#cloudformation()
      .send(new CancelUpdateStackCommand({ StackName: stackName }))
      .catch(errHandler);
  };

  deleteStack = (stackName: string, { roleArn }: { roleArn?: string }) => {
    const errHandler = this.#getErrorHandler('Failed to initiate stack deletion.');
    return this.#cloudformation()
      .send(new DeleteStackCommand({ StackName: stackName, RoleARN: roleArn }))
      .catch(errHandler);
  };

  rollbackStack = (stackName: string, { roleArn }: { roleArn: string }) => {
    const errHandler = this.#getErrorHandler('Failed to initiate stack rollback.');
    return this.#cloudformation()
      .send(new RollbackStackCommand({ StackName: stackName, RoleARN: roleArn }))
      .catch(errHandler);
  };

  continueUpdateRollback = (stackName: string, { roleArn }: { roleArn: string }) => {
    const errHandler = this.#getErrorHandler('Failed to initiate stack rollback continuation.');
    return this.#cloudformation()
      .send(new ContinueUpdateRollbackCommand({ StackName: stackName, RoleARN: roleArn }))
      .catch(errHandler);
  };

  getAssumedRoleCredentials = async ({
    roleArn,
    roleSessionName,
    durationSeconds,
    retry
  }: {
    roleArn: string;
    roleSessionName: string;
    durationSeconds?: number;
    retry?: { count: number; delaySeconds: number };
  }): Promise<Credentials> => {
    const errHandler = this.#getErrorHandler('Failed to get credentials for assumed role.');
    // max session duration is 12 hours
    const duration = durationSeconds && durationSeconds <= 60 * 60 ? 60 * 60 : durationSeconds || 60 * 60 * 12;

    const executeAssumeRole = async () => {
      const result = await this.#sts()
        .send(
          new AssumeRoleCommand({
            RoleArn: roleArn,
            DurationSeconds: duration,
            RoleSessionName: roleSessionName
          })
        )
        .catch(errHandler);
      return {
        accessKeyId: result.Credentials.AccessKeyId,
        secretAccessKey: result.Credentials.SecretAccessKey,
        expiration: result.Credentials.Expiration,
        sessionToken: result.Credentials.SessionToken
      };
    };

    if (retry) {
      return pRetry(executeAssumeRole, {
        retries: retry.count,
        onFailedAttempt: async (error) => {
          this.printer?.debug(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
          await wait(retry.delaySeconds * 1000);
        }
      });
    }

    return executeAssumeRole();
  };

  addUserToRolePrincipals = async ({ userArn, roleName }: { userArn: string; roleName: string }) => {
    const errHandler = this.#getErrorHandler(`Failed to add user ${userArn} to be a principal in role ${roleName}.`);

    const role = await this.getRole({ roleName, throwErrorWhenRoleNotExists: true }).catch(errHandler);
    const { AssumeRolePolicyDocument } = role;

    const parsedAssumeRolePolicy = JSON.parse(decodeURIComponent(AssumeRolePolicyDocument));

    const rolePolicyAlreadyHasStatementForThisUser = parsedAssumeRolePolicy.Statement.find(
      ({ Principal }) => Principal?.AWS === userArn
    );
    if (rolePolicyAlreadyHasStatementForThisUser) {
      this.printer?.debug(`User ${userArn} is already principal for the role ${roleName}.`);
      return;
    }
    parsedAssumeRolePolicy.Statement.push({
      Effect: 'Allow',
      Principal: {
        AWS: userArn
      },
      Action: 'sts:AssumeRole'
    });

    return this.#iam()
      .send(
        new UpdateAssumeRolePolicyCommand({
          PolicyDocument: JSON.stringify(parsedAssumeRolePolicy),
          RoleName: roleName
        })
      )
      .catch(async (err) => {
        // if there is some invalid principal in policy (possibly due to deleted connected account or deleted identity)
        // remove it
        if (
          err instanceof MalformedPolicyDocumentException &&
          `${err}`.includes('Invalid principal in policy') &&
          !`${err}`.includes(userArn)
        ) {
          const malformedPrincipalIndex = parsedAssumeRolePolicy.Statement.findIndex(
            ({ Principal }) => Principal.AWS && `${err}`.includes(Principal.AWS)
          );
          if (malformedPrincipalIndex !== -1) {
            parsedAssumeRolePolicy.Statement.splice(malformedPrincipalIndex, 1);
            await this.#iam()
              .send(
                new UpdateAssumeRolePolicyCommand({
                  PolicyDocument: JSON.stringify(parsedAssumeRolePolicy),
                  RoleName: roleName
                })
              )
              .catch(errHandler);
            return;
          }
        }
        errHandler(err);
      });
  };

  removeUserFromRolePrincipals = async ({ userArn, roleName }: { userArn: string; roleName: string }) => {
    const errHandler = this.#getErrorHandler(`Failed to remove user ${userArn} as a principal in role ${roleName}.`);
    const role = await this.getRole({ roleName, throwErrorWhenRoleNotExists: true }).catch(errHandler);
    const { AssumeRolePolicyDocument } = role;

    const parsedAssumeRolePolicy = JSON.parse(decodeURIComponent(AssumeRolePolicyDocument));
    const rolePolicyHasStatementForThisUser = parsedAssumeRolePolicy.Statement.find(
      ({ Principal }) => Principal?.AWS === userArn
    );
    if (!rolePolicyHasStatementForThisUser) {
      this.printer?.debug(`User ${userArn} is not among principals of the role ${roleName}.`);
      return;
    }
    const filteredStatements = parsedAssumeRolePolicy.Statement.filter(({ Principal }) => Principal?.AWS !== userArn);
    parsedAssumeRolePolicy.Statement = filteredStatements;
    return this.#iam()
      .send(
        new UpdateAssumeRolePolicyCommand({
          PolicyDocument: JSON.stringify(parsedAssumeRolePolicy),
          RoleName: roleName
        })
      )
      .catch(errHandler);
  };

  getStackEvents = async (stackName: string, since: Date) => {
    const errHandler = this.#getErrorHandler('Failed to fetch stack events.');
    const result: StackEvent[][] = [];
    let { NextToken, StackEvents } = await this.#cloudformation()
      .send(new DescribeStackEventsCommand({ StackName: stackName }))
      .catch(errHandler);
    result.push(StackEvents.filter(({ Timestamp }) => Timestamp >= since));
    while (NextToken && new Date(StackEvents[StackEvents.length - 1].Timestamp) >= since) {
      ({ NextToken, StackEvents } = await this.#cloudformation()
        .send(new DescribeStackEventsCommand({ StackName: stackName, NextToken }))
        .catch(errHandler));
      result.push(StackEvents);
    }
    return result.flat();
  };

  getStackResources = async (stackName: string): Promise<StackResourceSummary[]> => {
    const errHandler = this.#getErrorHandler('Could not fetch existing stack information.');
    const result: StackResourceSummary[] = [];
    let { StackResourceSummaries, NextToken } = (await this.#cloudformation()
      .send(new ListStackResourcesCommand({ StackName: stackName }))
      .catch((err) => {
        if (err.message.startsWith('Stack with id') && err.message.endsWith('does not exist')) {
          return [];
        }
        errHandler(err);
      })) as ListStackResourcesCommandOutput;
    result.push(...(StackResourceSummaries || []));
    while (NextToken) {
      ({ StackResourceSummaries, NextToken } = (await this.#cloudformation()
        .send(new ListStackResourcesCommand({ StackName: stackName, NextToken }))
        .catch((err) => {
          if (err.message.startsWith('Stack with id') && err.message.endsWith('does not exist')) {
            return [];
          }
          errHandler(err);
        })) as ListStackResourcesCommandOutput);

      result.push(...(StackResourceSummaries || []));
    }
    return result;
  };

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

  listStacks = async (): Promise<StackSummary[]> => {
    const errHandler = this.#getErrorHandler('Could not list stacks');
    const result: StackSummary[] = [];
    let { StackSummaries, NextToken } = await this.#cloudformation().send(new ListStacksCommand({})).catch(errHandler);
    result.push(...(StackSummaries || []));
    while (NextToken) {
      ({ StackSummaries, NextToken } = await this.#cloudformation()
        .send(new ListStacksCommand({ NextToken }))
        .catch(errHandler));
      result.push(...(StackSummaries || []));
    }
    return result;
  };

  getStackDetails = async (stackName: string, region?: string): Promise<StackDetails> => {
    const errHandler = this.#getErrorHandler('Could not fetch existing stack information.');
    const cfClient =
      region && region !== this.#getClientArgs().region
        ? new CloudFormationClient({ ...this.#getClientArgs(), region })
        : this.#cloudformation();
    const stackDescription = await cfClient.send(new DescribeStacksCommand({ StackName: stackName })).catch((err) => {
      if (err.message.startsWith('Stack with id') && err.message.endsWith('does not exist')) {
        return null;
      }
      errHandler(err);
    });
    if (stackDescription) {
      const stackData = stackDescription.Stacks[0] as Stack;
      return {
        ...stackData,
        Outputs: stackData?.Outputs || [],
        stackOutput: (stackData.Outputs || []).reduce((acc, val) => {
          acc[val.OutputKey] = val.OutputValue;
          return acc;
        }, {}) as {
          [outputName: string]: string;
        }
      };
    }
    return null;
  };

  createBucket = async ({
    bucketName,
    setEncryption,
    bucketPolicy,
    enableTransferAcceleration
  }: {
    bucketName: string;
    setEncryption?: boolean;
    bucketPolicy?: any;
    enableTransferAcceleration?: boolean;
  }) => {
    const errHandler = this.#getErrorHandler(`Error when creating bucket with name ${bucketName}.`);
    await this.#s3()
      .send(new CreateBucketCommand({ Bucket: bucketName }))
      .catch(errHandler);
    if (setEncryption) {
      await this.#s3()
        .send(
          new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
              Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
            }
          })
        )
        .catch(errHandler);
    }
    if (bucketPolicy) {
      await this.#s3()
        .send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: JSON.stringify(bucketPolicy) }))
        .catch(errHandler);
    }
    if (enableTransferAcceleration) {
      await this.#s3().send(
        new PutBucketAccelerateConfigurationCommand({
          Bucket: bucketName,
          AccelerateConfiguration: { Status: 'Enabled' }
        })
      );
    }
    await waitUntilBucketExists({ client: this.#s3(), maxWaitTime: 30 }, { Bucket: bucketName });
  };

  bucketExists = async ({ bucketName }: { bucketName: string }) => {
    const errHandler = this.#getErrorHandler(`Error when checking for bucket with name ${bucketName}.`);
    try {
      await this.#s3().send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (err) {
      if (err instanceof S3ServiceException && err.name === 'NotFound') {
        return false;
      }
      errHandler(err);
    }
    return true;
  };

  waitForBucketExists = async ({ bucketName, maxTime }: { bucketName: string; maxTime: number }) => {
    const errHandler = this.#getErrorHandler(`Waiting for bucket creation timed-out (bucket ${bucketName}).`);
    const waiterResult = await createWaiter(
      { client: this.#s3(), maxWaitTime: maxTime, minDelay: 1, maxDelay: 1 },
      { bucketName },
      async (_s3Cli, input) => {
        const bucketExists = await this.bucketExists(input);

        if (bucketExists) {
          return {
            state: WaiterState.SUCCESS,
            reason: `Bucket ${bucketName} created successfully (available).`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: `Bucket ${bucketName} not available.`
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errHandler(new Error(waiterResult.reason));
    }
  };

  uploadToBucket = async ({
    filePath,
    s3Key,
    contentType,
    bucketName,
    useS3Acceleration,
    metadata
  }: {
    bucketName: string;
    filePath: string;
    s3Key: string;
    contentType?: string;
    useS3Acceleration?: boolean;
    metadata?: { [key: string]: string };
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failed to upload file ${filePath} to bucket ${bucketName}. S3 key: ${s3Key}.`
    );
    const uploadCommand = new Upload({
      params: {
        Bucket: bucketName,
        Key: s3Key,
        Body: fsExtra.createReadStream(filePath),
        ...(contentType ? { ContentType: contentType } : {}),
        ...(metadata ? { Metadata: metadata } : {})
      },
      client: useS3Acceleration ? this.#acceleratedS3() : this.#s3()
    });
    return uploadCommand.done().catch(errHandler);
  };

  getFromBucket = async ({
    bucketName,
    s3Key,
    injectedS3Client
  }: {
    bucketName: string;
    s3Key: string;
    injectedS3Client?: S3Client;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to get object from bucket ${bucketName}. S3 key: ${s3Key}.`);
    const response = await (injectedS3Client || this.#s3())
      .send(new GetObjectCommand({ Bucket: bucketName, Key: s3Key }))
      .catch(errHandler);

    return streamToString(response.Body as Readable);
  };

  listAllImagesInEcrRepo = async (repositoryName: string): Promise<ImageIdentifier[]> => {
    const errHandler = this.#getErrorHandler(`Failed to list images in ECR repository ${repositoryName}.`);
    const pagedImageIds: ImageIdentifier[][] = [];
    let { nextToken, imageIds } = await this.#ecr().send(new ListImagesCommand({ repositoryName })).catch(errHandler);
    pagedImageIds.push(imageIds);
    while (nextToken) {
      ({ nextToken, imageIds } = await this.#ecr()
        .send(new ListImagesCommand({ repositoryName, nextToken }))
        .catch(errHandler));
      pagedImageIds.push(imageIds);
    }
    return pagedImageIds.flat();
  };

  batchDeleteImages = async (repositoryName: string, imageTags: string[], imageDigests: string[]) => {
    const errHandler = this.#getErrorHandler(
      `Failed to batch delete images with tags/digests: ${imageTags.join(', ')}, ${imageDigests.join(', ')}.`
    );
    if (imageTags.length || imageDigests.length) {
      return this.#ecr()
        .send(
          new BatchDeleteImageCommand({
            repositoryName,
            imageIds: [
              ...imageTags.map((tag) => ({ imageTag: tag })),
              ...imageDigests.map((digest) => ({ imageDigest: digest }))
            ]
          })
        )
        .catch(errHandler);
    }
    return Promise.resolve();
  };

  getEcrAuthDetails = async () => {
    const errHandler = this.#getErrorHandler('Failed to get authorization data for Docker registry from AWS ECR.');
    const getAuthResponse = await this.#ecr().send(new GetAuthorizationTokenCommand({})).catch(errHandler);
    // @note https://docs.aws.amazon.com/AmazonECR/latest/userguide/Registries.html
    const { authorizationToken, proxyEndpoint } = getAuthResponse.authorizationData[0];
    const [user, password] = Buffer.from(authorizationToken, 'base64').toString().split(':');
    return { user, password, proxyEndpoint };
  };

  listEcrReposForStack = async (stackName: string): Promise<string[]> => {
    const errHandler = this.#getErrorHandler('Failed to list ECR repositories.');
    const res = await this.#ecr().send(new DescribeRepositoriesCommand({})).catch(errHandler);
    return res.repositories
      .filter((repo) => repo.repositoryName.startsWith(stackName))
      .map((repo) => repo.repositoryName);
  };

  copyWithinBucket = async ({
    toS3Key,
    fromS3Key,
    bucketName
  }: {
    fromS3Key: string;
    toS3Key: string;
    bucketName: string;
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failed to copy object ${fromS3Key} to ${toS3Key} within deployment bucket.`
    );
    return this.#s3()
      .send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${fromS3Key}`,
          Key: toS3Key
        })
      )
      .catch(errHandler);
  };

  syncDirectoryIntoBucket = async ({
    // directoryPath,
    uploadConfiguration: {
      directoryPath,
      fileOptions,
      excludeFilesPatterns,
      disableS3TransferAcceleration,
      headersPreset
    },
    bucketName,
    deleteRemoved,
    onProgress
  }: {
    bucketName: string;
    deleteRemoved?: boolean;
    onProgress: (params: S3SyncInfo) => any;
    uploadConfiguration: DirectoryUpload;
  }): Promise<S3SyncInfo> => {
    if (!fsExtra.existsSync(directoryPath)) {
      raiseError({
        type: 'SYNC_BUCKET',
        message: `Directory at "${directoryPath}" doesn't exists or is not accessible.`
      });
    }

    const finalFilters = (headersPreset ? automaticUploadFilterPresets[headersPreset] : []).concat(fileOptions || []);

    const uploader = (disableS3TransferAcceleration === true ? this.#syncS3() : this.#acceleratedSyncS3()).uploadDir({
      localDir: directoryPath,
      deleteRemoved,
      skipFiles: excludeFilesPatterns,
      s3Params: {
        Bucket: bucketName
      },
      // this function gets called for every file that needs to be uploaded
      // everything that you put into callback's s3Params will be added to the S3 params of the S3 request for given file
      getS3Params: (localFilePath: string, _localFileStats: Stats, callback: (err: any, s3Params: any) => void) => {
        const localFileRelativePath = path.relative(directoryPath, localFilePath);
        const cumulatedMetadataHeaders: { [key: string]: string } = {};
        const cumulatedTags: string[] = [];
        const nativelySupportedHeaders: { [key: string]: string } = {};
        (finalFilters || []).forEach((filter) => {
          if (
            stringMatchesGlob(localFileRelativePath, filter.includePattern) &&
            !(filter.excludePattern && stringMatchesGlob(localFileRelativePath, filter.excludePattern))
          ) {
            filter.headers?.forEach(({ key, value }) => {
              if (isBucketNativelySupportedHeader(key)) {
                nativelySupportedHeaders[pascalCase(key)] = value;
              } else {
                cumulatedMetadataHeaders[key] = value;
              }
            });
            filter.tags?.forEach(({ key, value }) => {
              cumulatedTags.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            });
          }
        });
        callback(null, {
          Metadata: cumulatedMetadataHeaders,
          Tagging: cumulatedTags.join('&'),
          ...nativelySupportedHeaders
        });
      }
    });
    let maxProgressPercent = 0;
    const getStats = (): S3SyncInfo => {
      const {
        activeTransfers,
        progressAmount,
        progressTotal,
        progressMd5Amount,
        progressMd5Total,
        objectsFound,
        filesFound,
        deleteAmount,
        deleteTotal
      } = uploader as any;
      // Only calculate percentage when progressTotal is valid and > 0 to avoid NaN/Infinity
      const total = Number(progressTotal);
      const amount = Number(progressAmount);
      if (total > 0 && Number.isFinite(amount)) {
        const rawPercent = (amount / total) * 100;
        // Ensure percentage never decreases (total can grow as files are discovered)
        if (rawPercent > maxProgressPercent) {
          maxProgressPercent = Math.min(rawPercent, 100);
        }
      }
      return {
        activeTransfers,
        progressAmount,
        progressTotal,
        progressMd5Amount,
        progressMd5Total,
        objectsFound,
        filesFound,
        deleteAmount,
        deleteTotal,
        progressPercent: maxProgressPercent > 0 ? maxProgressPercent.toFixed(2) : '0'
      };
    };
    let lastStats = getStats();
    const interval = setInterval(async () => {
      await onProgress(lastStats);
    }, 50);
    return new Promise((resolve, reject) => {
      uploader.on('error', (err: any) => {
        reject(
          getError({
            type: 'SYNC_BUCKET',
            message: `Syncing files from directory '${getRelativePath(
              directoryPath
            )}' into ${bucketName} failed. Error:\n${err}.`
          })
        );
      });
      uploader.on('progress', () => {
        lastStats = getStats();
      });
      uploader.on('end', async () => {
        clearInterval(interval);
        resolve(getStats());
      });
    });
  };

  batchDeleteObjects = async (bucketName: string, objectKeys: ObjectIdentifier[]) => {
    const errHandler = this.#getErrorHandler(`Failed to batch delete objects from bucket ${bucketName}.`);
    const validObjectKeys = objectKeys.filter((obj) => obj?.Key);
    if (validObjectKeys.length) {
      return Promise.all(
        chunkArray(validObjectKeys, 1000).map((chunk) =>
          this.#s3()
            .send(
              new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: { Objects: chunk }
              })
            )
            .catch(errHandler)
        )
      );
    }
    return Promise.resolve();
  };

  listAllObjectsInBucket = async (bucketName: string, injectedS3Client?: S3Client) => {
    let result: _Object[] = [];
    const errHandler = this.#getErrorHandler(`Failed to list all objects in bucket ${bucketName}.`);
    let { Contents, NextContinuationToken } = await (injectedS3Client || this.#s3())
      .send(new ListObjectsV2Command({ Bucket: bucketName }))
      .catch(errHandler);

    result = result.concat(Contents);
    while (NextContinuationToken) {
      ({ Contents, NextContinuationToken } = await (injectedS3Client || this.#s3())
        .send(new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken: NextContinuationToken }))
        .catch(errHandler));
      result = result.concat(Contents);
    }
    return result.filter((obj) => obj !== null && obj !== undefined);
  };

  listAllVersionedObjectsInBucket = async (bucketName: string, injectedS3Client?: S3Client) => {
    let result: ObjectVersion[] = [];
    const errHandler = this.#getErrorHandler(`Failed to list all versioned objects in bucket ${bucketName}.`);
    let { Versions, DeleteMarkers, NextKeyMarker, NextVersionIdMarker } = await (injectedS3Client || this.#s3())
      .send(new ListObjectVersionsCommand({ Bucket: bucketName }))
      .catch(errHandler);

    result = result.concat(Versions, DeleteMarkers);
    while (NextKeyMarker || NextVersionIdMarker) {
      ({ Versions, DeleteMarkers, NextKeyMarker, NextVersionIdMarker } = await (injectedS3Client || this.#s3())
        .send(
          new ListObjectVersionsCommand({
            Bucket: bucketName,
            KeyMarker: NextKeyMarker,
            VersionIdMarker: NextVersionIdMarker
          })
        )
        .catch(errHandler));
      result = result.concat(Versions, DeleteMarkers);
    }
    return result.filter((obj) => obj !== null && obj !== undefined);
  };

  emptyBucket = async (bucketName: string) => {
    const objects = await this.listAllObjectsInBucket(bucketName);
    return this.batchDeleteObjects(bucketName, objects as ObjectIdentifier[]);
  };

  listAllPrivateCloudformationResourceTypesWithVersions = async () => {
    const errHandler = this.#getErrorHandler('Failed to list private cloudformation types.');

    let { TypeSummaries, NextToken } = await this.#cloudformation()
      .send(new ListTypesCommand({ DeprecatedStatus: 'LIVE', Type: 'RESOURCE', Visibility: 'PRIVATE' }))
      .catch(errHandler);
    let typesList: TypeSummary[] = TypeSummaries;
    while (NextToken) {
      ({ TypeSummaries, NextToken } = await this.#cloudformation()
        .send(new ListTypesCommand({ DeprecatedStatus: 'LIVE', Type: 'RESOURCE', Visibility: 'PRIVATE', NextToken }))
        .catch(errHandler));
      typesList = typesList.concat(TypeSummaries);
    }
    const typesVersions: { [typeName: string]: TypeVersionSummary[] } = {};
    await Promise.all(
      typesList.map(async ({ TypeArn, TypeName }) => {
        let { TypeVersionSummaries, NextToken: VersionNextToken } = await this.#cloudformation()
          .send(new ListTypeVersionsCommand({ Arn: TypeArn }))
          .catch(errHandler);
        typesVersions[TypeName] = TypeVersionSummaries;
        while (VersionNextToken) {
          ({ TypeVersionSummaries, NextToken: VersionNextToken } = await this.#cloudformation()
            .send(new ListTypeVersionsCommand({ Arn: TypeArn, NextToken: VersionNextToken }))
            .catch(errHandler));
          typesVersions[TypeName] = typesVersions[TypeName].concat(TypeVersionSummaries);
        }
      })
    );
    return typesVersions;
  };

  registerPrivateCloudformationResourceType = async ({
    schemaHandlerPackageS3Url,
    typeName,
    executionRoleArn,
    rateLimiter
  }: {
    schemaHandlerPackageS3Url: string;
    typeName: string;
    executionRoleArn?: string;
    // logGroupName: string;
    rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to register private cloudformation resource type ${typeName}.`);
    const { RegistrationToken } = await rateLimiter(() =>
      this.#cloudformation()
        .send(
          new RegisterTypeCommand({
            SchemaHandlerPackage: schemaHandlerPackageS3Url,
            TypeName: typeName,
            ExecutionRoleArn: executionRoleArn,
            Type: 'RESOURCE'
            // for now we are not logging from custom resources, due to leaky credentials
            // LoggingConfig: { LogGroupName: logGroupName, LogRoleArn: executionRoleArn }
          })
        )
        .catch(errHandler)
    );
    // await wait(500);
    let { ProgressStatus, Description, TypeVersionArn } = await rateLimiter(() =>
      this.#cloudformation().send(new DescribeTypeRegistrationCommand({ RegistrationToken })).catch(errHandler)
    );

    while (ProgressStatus !== 'COMPLETE') {
      // await wait(1000);
      ({ ProgressStatus, Description, TypeVersionArn } = await rateLimiter(() =>
        this.#cloudformation().send(new DescribeTypeRegistrationCommand({ RegistrationToken })).catch(errHandler)
      ));
      await wait(10000);
      if (ProgressStatus === 'FAILED') {
        raiseError({
          type: 'AWS',
          message: `Registration of private cloudformation resource type ${typeName} failed. Registration description: ${Description}`
        });
      }
    }
    return TypeVersionArn;
  };

  setPrivateCloudformationResourceTypeAsDefault = async ({
    typeVersionArn,
    rateLimiter
  }: {
    typeVersionArn: string;
    rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failed to set private cloudformation resource type version ${typeVersionArn} as default`
    );
    await rateLimiter(() =>
      this.#cloudformation()
        .send(new SetTypeDefaultVersionCommand({ Arn: typeVersionArn }))
        .catch(errHandler)
    );
  };

  deregisterPrivateCloudformationType = async ({
    typeVersionArn,
    rateLimiter
  }: {
    typeVersionArn: string;
    rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failed to deregister private cloudformation resource type version ${typeVersionArn}.`
    );
    await rateLimiter(() =>
      this.#cloudformation()
        .send(new DeregisterTypeCommand({ Arn: typeVersionArn }))
        .catch(errHandler)
    );
  };

  getRole = async ({
    roleName,
    throwErrorWhenRoleNotExists
  }: {
    roleName: string;
    throwErrorWhenRoleNotExists?: boolean;
  }): Promise<GetRoleCommandOutput['Role']> => {
    try {
      const existingRole = await this.#iam().send(new GetRoleCommand({ RoleName: roleName }));
      return existingRole.Role;
    } catch (err) {
      if (err instanceof NoSuchEntityException && !throwErrorWhenRoleNotExists) {
        this.printer?.debug(`Role with name ${roleName} does NOT exist.`);
        return undefined;
      }
      throw err;
    }
  };

  confirmUserSignup = async ({ userName, userPoolId }: { userName: string; userPoolId: string }) => {
    return this.#cognito().send(new AdminConfirmSignUpCommand({ Username: userName, UserPoolId: userPoolId }));
  };

  listUsersInUserpool = async ({ userPoolId }: { userPoolId: string }) => {
    const params = { UserPoolId: userPoolId };
    const allUsers: UserType[][] = [];
    let { Users, PaginationToken } = await this.#cognito().send(new ListUsersCommand(params));
    allUsers.push(Users);
    while (PaginationToken) {
      ({ Users, PaginationToken } = await this.#cognito().send(new ListUsersCommand({ ...params, PaginationToken })));
      allUsers.push(Users);
    }
    return allUsers.flat().map((user) => {
      const result: {
        createdAt: Date;
        updatedAt: Date;
        userName: string;
        status: string;
        [attribute: string]: any;
      } = {
        createdAt: user.UserCreateDate,
        updatedAt: user.UserLastModifiedDate,
        userName: user.Username,
        status: user.UserStatus
      };
      user.Attributes.forEach((attr) => {
        result[attr.Name] = attr.Value;
      });
      return result;
    });
  };

  updateExistingLambdaFunctionCode = async ({
    lambdaResourceName,
    artifactBucketName,
    artifactS3Key
  }: {
    lambdaResourceName: string;
    artifactBucketName: string;
    artifactS3Key: string;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to update function code of function ${lambdaResourceName}.`);
    return this.#lambda()
      .send(
        new UpdateFunctionCodeCommand({
          FunctionName: lambdaResourceName,
          S3Bucket: artifactBucketName,
          S3Key: artifactS3Key
        })
      )
      .catch(errHandler);
  };

  getLambda = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errHandler = this.#getErrorHandler(`Failed to get configuration of function ${lambdaResourceName}.`);
    return this.#lambda()
      .send(
        new GetFunctionConfigurationCommand({
          FunctionName: lambdaResourceName
        })
      )
      .catch(errHandler);
  };

  invokeLambdaFunction = async ({
    lambdaResourceName,
    payload,
    asynchronous
  }: {
    lambdaResourceName: string;
    payload: { [key: string]: any };
    asynchronous?: boolean;
  }): Promise<InvokeLambdaReturnValue> => {
    const errHandler = this.#getErrorHandler(`Failed to invoke function ${lambdaResourceName}.`);

    const response = await this.#lambda()
      .send(
        new InvokeCommand({
          FunctionName: lambdaResourceName,
          Payload: fromUtf8(JSON.stringify(payload)),
          InvocationType: asynchronous ? 'Event' : 'RequestResponse'
        })
      )
      .catch(errHandler);
    return {
      ...response,
      Payload: toUtf8(response.Payload)
    };
  };

  createIamRole = async ({
    roleName,
    assumeRolePolicyDocument,
    description,
    maxSessionDuration
  }: {
    roleName: string;
    assumeRolePolicyDocument: { [key: string]: any };
    description?: string;
    maxSessionDuration?: number;
  }) => {
    const errHandler = this.#getErrorHandler(`Unable to create role ${roleName}.`);
    const cmdOut = await this.#iam()
      .send(
        new CreateRoleCommand({
          RoleName: roleName,
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
          Description: description,
          MaxSessionDuration: maxSessionDuration
        })
      )
      .catch(errHandler);
    await waitUntilRoleExists({ client: this.#iam(), maxWaitTime: 60 }, { RoleName: cmdOut.Role.RoleName });
    return cmdOut.Role;
  };

  updateIamRoleAssumePolicy = async ({
    roleName,
    assumeRolePolicyDocument
  }: {
    roleName: string;
    assumeRolePolicyDocument: { [key: string]: any };
  }) => {
    const errHandler = this.#getErrorHandler(`Unable to update role ${roleName} assume policy.`);
    return this.#iam()
      .send(
        new UpdateAssumeRolePolicyCommand({
          RoleName: roleName,
          PolicyDocument: JSON.stringify(assumeRolePolicyDocument)
        })
      )
      .catch(errHandler);
  };

  attachPolicyToRole = async ({ roleName, policyArn }: { roleName: string; policyArn: string }) => {
    const errHandler = this.#getErrorHandler(`Unable to add policy ${policyArn} to role ${roleName}.`);
    await this.#iam()
      .send(
        new AttachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policyArn
        })
      )
      .catch(errHandler);
    await waitUntilPolicyExists({ client: this.#iam(), maxWaitTime: 60 }, { PolicyArn: policyArn });
  };

  modifyInlinePoliciesForIamRole = async ({
    roleName,
    desiredPolicies
  }: {
    roleName: string;
    desiredPolicies: Policy[];
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to modify role policies of role ${roleName}.`);
    // first we list policies for a role
    const currentPolicyNames = await this.listAllInlinePoliciesForIamRole({ roleName });
    // we are determining which policies are to be deleted
    const policiesToBeDeleted = currentPolicyNames.filter(
      (currentlyIncludedPolicy) => !desiredPolicies.some(({ PolicyName }) => PolicyName === currentlyIncludedPolicy)
    );
    // here happens the actual modification
    // we are adding/updating according to desiredPolicies
    await Promise.all(
      desiredPolicies.map(async (policyConfig) => {
        return this.#iam().send(
          new PutRolePolicyCommand({
            PolicyName: `${policyConfig.PolicyName}`,
            PolicyDocument: JSON.stringify(policyConfig.PolicyDocument),
            RoleName: roleName
          })
        );
      })
    ).catch(errHandler);

    // here we are deleting policies that are no longer desired
    if (policiesToBeDeleted?.length) {
      await Promise.all(
        policiesToBeDeleted.map(async (PolicyName) => {
          return this.#iam().send(new DeleteRolePolicyCommand({ PolicyName, RoleName: roleName }));
        })
      ).catch(errHandler);
    }
  };

  listAllInlinePoliciesForIamRole = async ({ roleName }: { roleName: string }) => {
    const errHandler = this.#getErrorHandler(`Failed to list role policies of role ${roleName}.`);
    const allPolicies: string[][] = [];
    let { Marker, PolicyNames } = await this.#iam()
      .send(
        new ListRolePoliciesCommand({
          RoleName: roleName
        })
      )
      .catch(errHandler);
    allPolicies.push(PolicyNames || []);
    while (Marker) {
      ({ Marker, PolicyNames } = await this.#iam()
        .send(
          new ListRolePoliciesCommand({
            RoleName: roleName,
            Marker
          })
        )
        .catch(errHandler));
      allPolicies.push(PolicyNames || []);
    }
    return allPolicies.flat();
  };

  getLogStreams = async ({
    logGroupName,
    logStreamNamePrefix,
    limit = 50,
    orderBy = 'LastEventTime'
  }: {
    logGroupName: string;
    logStreamNamePrefix?: string;
    limit?: number;
    orderBy?: OrderBy;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to get log streams for log group ${logGroupName}.`);
    const result = [];
    let amount = 0;
    let { logStreams, nextToken } = await this.#cloudwatchLogs()
      .send(
        new DescribeLogStreamsCommand({
          logGroupName,
          descending: true,
          orderBy,
          logStreamNamePrefix
        })
      )
      .catch(errHandler);

    result.push(logStreams);
    amount += logStreams?.length || 0;
    while (nextToken && amount < limit) {
      ({ logStreams, nextToken } = await this.#cloudwatchLogs()
        .send(
          new DescribeLogStreamsCommand({
            logGroupName,
            descending: true,
            orderBy,
            logStreamNamePrefix,
            nextToken
          })
        )
        .catch(errHandler));
      result.push(logStreams);
      amount += logStreams?.length || 0;
    }

    return result.flat();
  };

  getLogEvents = async ({
    startTime,
    logGroupName,
    logStreamNames,
    logStreamPrefix,
    filterPattern
  }: {
    logGroupName: string;
    logStreamNames?: string[];
    logStreamPrefix?: string;
    startTime?: number;
    filterPattern?: string;
  }): Promise<FilteredLogEvent[]> => {
    const errHandler = this.#getErrorHandler('Failed to get log event.');
    const params = {
      logGroupName,
      logStreamNames,
      logStreamNamePrefix: logStreamPrefix,
      startTime,
      ...(filterPattern && { filterPattern })
    };
    const result = [];
    let { events, nextToken } = await this.#cloudwatchLogs()
      .send(new FilterLogEventsCommand(params))
      .catch((err) => {
        if (err instanceof ResourceNotFoundException) {
          this.printer?.debug(`Error when fetching for logs: ${err} (${logGroupName} / ${logStreamNames})`);
          return { events: [] as FilteredLogEvent[], nextToken: undefined };
        }
        errHandler(err);
      });
    result.push(events);
    while (nextToken) {
      ({ events, nextToken } = await this.#cloudwatchLogs()
        .send(new FilterLogEventsCommand({ ...params, nextToken }))
        .catch(errHandler));
      result.push(events);
    }
    return result.flat();
  };

  getLogGroup = async ({ logGroupName }: { logGroupName: string }) => {
    return (await this.#cloudwatchLogs().send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName })))
      ?.logGroups?.[0];
  };

  createLogGroup = async ({
    logGroupName,
    retentionDays
  }: {
    logGroupName: string;
    retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
  }) => {
    await this.#cloudwatchLogs().send(new CreateLogGroupCommand({ logGroupName, tags: { stp: 'stp' } }));
    await wait(500);
    if (retentionDays) {
      await this.#cloudwatchLogs().send(
        new PutRetentionPolicyCommand({ logGroupName, retentionInDays: retentionDays })
      );
    }

    return this.getLogGroup({ logGroupName });
  };

  createLogStream = async ({ logGroupName, logStreamName }: { logGroupName: string; logStreamName: string }) => {
    const errHandler = this.#getErrorHandler('Failed to create log stream.');
    return this.#cloudwatchLogs().send(new CreateLogStreamCommand({ logGroupName, logStreamName })).catch(errHandler);
  };

  putLogEvents = async ({
    logGroupName,
    logStreamName,
    logEvents
  }: {
    logGroupName: string;
    logStreamName: string;
    logEvents: InputLogEvent[];
  }) => {
    const errHandler = this.#getErrorHandler('Failed to send log events.');
    return this.#cloudwatchLogs()
      .send(new PutLogEventsCommand({ logGroupName, logStreamName, logEvents }))
      .catch(errHandler);
  };

  updateExistingSecret = async (secretArn: string, newSecretString: string) => {
    const errHandler = this.#getErrorHandler('Failed to update secret.');
    return this.#secretsManager()
      .send(new UpdateSecretCommand({ SecretId: secretArn, SecretString: newSecretString }))
      .catch(errHandler);
  };

  createNewSecret = async (secretName: string, secretString: string) => {
    const errHandler = this.#getErrorHandler('Failed to create new secret.');
    return this.#secretsManager()
      .send(
        new CreateSecretCommand({
          Name: secretName,
          SecretString: secretString,
          Description: 'Created by Stacktape'
        })
      )
      .catch(errHandler);
  };

  getSecretValue = async ({
    secretId,
    versionId,
    versionStage
  }: {
    secretId: string;
    versionId?: string;
    versionStage?: string;
  }) => {
    const errHandler = this.#getErrorHandler('Failed to get secret value.');
    return this.#secretsManager()
      .send(
        new GetSecretValueCommand({
          SecretId: secretId,
          ...(versionId && { VersionId: versionId }),
          ...(versionStage && { VersionStage: versionStage })
        })
      )
      .catch(errHandler);
  };

  getSsmParameterValue = async ({ ssmParameterName, region }: { ssmParameterName: string; region?: string }) => {
    const errHandler = this.#getErrorHandler('Failed to get ssm parameter from store.');

    const ssmClient =
      region && region !== this.#getClientArgs().region
        ? new SSMClient({ ...this.#getClientArgs(), region })
        : this.#ssm();
    return ssmClient.send(new GetParameterCommand({ Name: ssmParameterName, WithDecryption: true })).catch(errHandler);
  };

  putSsmParameterValue = async ({
    ssmParameterName,
    value,
    encrypt
  }: {
    ssmParameterName: string;
    value: string;
    encrypt?: boolean;
  }) => {
    const errHandler = this.#getErrorHandler('Failed to put parameter to SSM parameter store.');
    return this.#ssm()
      .send(
        new PutParameterCommand({
          Name: ssmParameterName,
          Value: value,
          Type: encrypt ? ParameterType.SECURE_STRING : ParameterType.STRING,
          Overwrite: true
        })
      )
      .catch(errHandler);
  };

  deleteSsmParameter = async ({ ssmParameterName }: { ssmParameterName: string }) => {
    const errHandler = this.#getErrorHandler(`Failed to delete SSM parameter ${ssmParameterName}.`);
    return this.#ssm()
      .send(
        new DeleteParameterCommand({
          Name: ssmParameterName
        })
      )
      .catch((err) => {
        if (err instanceof ParameterNotFound) {
          this.printer?.debug(`Could not delete SSM parameter "${ssmParameterName}", because it does not exist.`);
          return;
        }
        return errHandler(err);
      });
  };

  getSsmParametersValues = async ({ ssmParametersNames }: { ssmParametersNames: string[] }) => {
    const errHandler = this.#getErrorHandler('Failed to get ssm parameters from store.');
    return (
      await Promise.all(
        chunkArray(ssmParametersNames, 10).map(async (chunk) => {
          const { Parameters } = await this.#ssm()
            .send(new GetParametersCommand({ Names: chunk, WithDecryption: true }))
            .catch(errHandler);
          return Parameters || [];
        })
      )
    ).flat();
  };

  deleteSecret = async (secretId: string) => {
    const errHandler = this.#getErrorHandler(`Failed to delete secret with id ${secretId}.`);
    return this.#secretsManager()
      .send(new DeleteSecretCommand({ SecretId: secretId }))
      .catch(errHandler);
  };

  listAllSecrets = async (): Promise<SecretListEntry[]> => {
    const errHandler = this.#getErrorHandler('Failed to list secrets.');
    const secrets: SecretListEntry[][] = [];
    const { SecretList, NextToken } = await this.#secretsManager().send(new ListSecretsCommand({})).catch(errHandler);
    secrets.push(SecretList);
    let nextToken = NextToken;
    while (nextToken) {
      const { SecretList: newList, NextToken: newToken } = await this.#secretsManager()
        .send(new ListSecretsCommand({ NextToken: nextToken }))
        .catch(errHandler);
      secrets.push(newList);
      nextToken = newToken;
    }
    return secrets.flat();
  };

  listAllHostedZones = async (): Promise<HostedZone[]> => {
    const errHandler = this.#getErrorHandler('Failed to list hosted zones.');
    let { HostedZones: hostedZones, NextMarker: nextMarker } = await this.#route53()
      .send(new ListHostedZonesCommand({ MaxItems: 100 }))
      .catch(errHandler);
    while (nextMarker) {
      const { HostedZones: newZones, NextMarker: newMarker } = await this.#route53()
        .send(new ListHostedZonesCommand({ MaxItems: 100, Marker: nextMarker }))
        .catch(errHandler);
      hostedZones = hostedZones.concat(newZones);
      nextMarker = newMarker;
    }
    return hostedZones;
  };

  getInfoForHostedZone = async (hostedZoneId: string) => {
    const errHandler = this.#getErrorHandler('Failed to get hosted zone details.');
    return this.#route53()
      .send(new GetHostedZoneCommand({ Id: hostedZoneId }))
      .catch(errHandler);
  };

  createCertificateValidationRecordInHostedZone = async (hostedZoneId: string, resourceRecord: ResourceRecord) => {
    const errHandler = this.#getErrorHandler(
      `Failed to create certificate validation record for hosted zone ${hostedZoneId}.`
    );
    return this.#route53()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: resourceRecord.Name,
                  Type: resourceRecord.Type,
                  TTL: 300,
                  ResourceRecords: [{ Value: resourceRecord.Value }]
                }
              }
            ]
          }
        })
      )
      .catch(errHandler);
  };

  getRecordsForHostedZone = async (hostedZoneId: string) => {
    const errHandler = this.#getErrorHandler(`Failed fetch get records for hosted zone ${hostedZoneId}.`);
    const result: ResourceRecordSet[] = [];
    let { ResourceRecordSets, IsTruncated, NextRecordName, NextRecordType, NextRecordIdentifier } =
      await this.#route53()
        .send(
          new ListResourceRecordSetsCommand({
            HostedZoneId: hostedZoneId
          })
        )
        .catch(errHandler);
    result.push(...ResourceRecordSets);
    while (IsTruncated) {
      ({ ResourceRecordSets, IsTruncated, NextRecordName, NextRecordType, NextRecordIdentifier } = await this.#route53()
        .send(
          new ListResourceRecordSetsCommand({
            HostedZoneId: hostedZoneId,
            StartRecordName: NextRecordName,
            StartRecordType: NextRecordType,
            StartRecordIdentifier: NextRecordIdentifier
          })
        )
        .catch(errHandler));
      result.push(...ResourceRecordSets);
    }
    return result;
  };

  createHostedZone = async (domainName: string) => {
    const errHandler = this.#getErrorHandler(`Failed create hosted zone for domain ${domainName}.`);
    return this.#route53()
      .send(
        new CreateHostedZoneCommand({
          Name: domainName,
          CallerReference: `${new Date().getTime().toString()}-${domainName}`,
          HostedZoneConfig: { Comment: COMMENT_FOR_STACKTAPE_ZONE }
        })
      )
      .catch(errHandler);
  };

  requestCertificateForDomainName = async (domainName: string, useUsEast1Acm?: boolean) => {
    const errHandler = this.#getErrorHandler(`Failed to request certificate for domain ${domainName}.`);
    const { CertificateArn: newCertArn } = await (useUsEast1Acm ? this.#usEast1Acm() : this.#acm())
      .send(
        new RequestCertificateCommand({
          DomainName: domainName,
          ValidationMethod: 'DNS',
          SubjectAlternativeNames: domainName.split('.').length === 2 ? [`*.${domainName}`] : undefined
        })
      )
      .catch(errHandler);
    await wait(5000);
    let certInfo = await this.getCertificateInfo(newCertArn, useUsEast1Acm);
    // We have to wait until the records in domain validation options are part of the response
    // We need this records for domain DNS validation through route 53
    while (!certInfo.DomainValidationOptions?.some((domainValidOpt) => domainValidOpt.ResourceRecord)) {
      await wait(3000);
      certInfo = await this.getCertificateInfo(newCertArn, useUsEast1Acm);
    }
    return certInfo;
  };

  listCertificatesForAccount = async (statuses?: CertificateStatus[], useUsEast1Acm?: boolean) => {
    const errHandler = this.#getErrorHandler('Failed to list certificates.');
    const acmClient = useUsEast1Acm ? this.#usEast1Acm() : this.#acm();
    const res = await acmClient.send(new ListCertificatesCommand({ CertificateStatuses: statuses })).catch(errHandler);
    return res.CertificateSummaryList;
  };

  getCertificateInfo = async (certArn: string, useUsEast1Acm?: boolean) => {
    const errHandler = this.#getErrorHandler('Failed to fetch certificate details.');
    const acmClient = useUsEast1Acm ? this.#usEast1Acm() : this.#acm();
    const res = await acmClient.send(new DescribeCertificateCommand({ CertificateArn: certArn })).catch(errHandler);
    return res.Certificate as CertificateDetail;
  };

  getCertificateTags = async (certArn: string) => {
    const errHandler = this.#getErrorHandler('Failed to get tags for certificate.');
    const res = await this.#acm()
      .send(new ListTagsForCertificateCommand({ CertificateArn: certArn }))
      .catch(errHandler);
    return res.Tags;
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

  createCloudformationChangeSet = async (input: CreateChangeSetInput) => {
    const errHandler = this.#getErrorHandler('Failed to fetch change-set details.');

    const { Id, StackId } = await this.#cloudformation()
      .send(new CreateChangeSetCommand(input))
      .catch(this.#getErrorHandler('Failed to initiate creation of changes set.'));

    let changeSet = await this.#cloudformation()
      .send(new DescribeChangeSetCommand({ ChangeSetName: Id }))
      .catch(errHandler);
    while (changeSet.Status !== 'CREATE_COMPLETE') {
      await wait(750);
      changeSet = await this.#cloudformation()
        .send(new DescribeChangeSetCommand({ ChangeSetName: Id }))
        .catch(errHandler);
    }

    return { changes: changeSet.Changes, changeSetId: Id, stackId: StackId };
  };

  executeChangeSet = async (changeSetId: string) => {
    const errHandler = this.#getErrorHandler('Failed to initiate execution of change-set.');
    return this.#cloudformation()
      .send(new ExecuteChangeSetCommand({ ChangeSetName: changeSetId }))
      .catch(errHandler);
  };

  setStackPolicy = async (input: SetStackPolicyInput) => {
    const errHandler = this.#getErrorHandler('Failed to update stack policy.');
    return this.#cloudformation().send(new SetStackPolicyCommand(input)).catch(errHandler);
  };

  setTerminationProtection = async (enabled: boolean, stackName: string) => {
    const errHandler = this.#getErrorHandler('Failed to set termination protection');
    return this.#cloudformation()
      .send(new UpdateTerminationProtectionCommand({ EnableTerminationProtection: enabled, StackName: stackName }))
      .catch(errHandler);
  };

  setAwsAccountEcsSetting = async (settingName: string, settingValue: 'enabled' | 'disabled') => {
    const errHandler = this.#getErrorHandler(
      `Unable to set ecs setting ${settingName} to desired value ${settingValue}`
    );
    return this.#ecs()
      .send(new PutAccountSettingDefaultCommand({ name: settingName, value: settingValue }))
      .catch(errHandler);
  };

  getCfStackTemplate = async (stackName: string) => {
    const errHandler = this.#getErrorHandler(
      `Unable to retrieve template of a Cloudformation stack with name ${stackName}`
    );
    // const templateString = (await this.#cloudformation().send(new GetTemplateCommand({ StackName: stackName })))
    //   .TemplateBody;
    return parseYaml(
      (
        await this.#cloudformation()
          .send(new GetTemplateCommand({ StackName: stackName }))
          .catch(errHandler)
      ).TemplateBody
    );
  };

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
    const bucketDomainName = resourceURIs.bucket({ bucketName, region: this.#getClientArgs().region });
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

  tagDynamoTable = async ({ tableName, tags }: { tableName: string; tags: Tag[] }) => {
    const errHandler = this.#getErrorHandler('Failed to tag dynamo table.');
    const {
      Table: { TableArn: tableArn }
    } = await this.#dynamo().send(new DescribeTableCommand({ TableName: tableName }));
    return this.#dynamo()
      .send(new TagDynamoTable({ ResourceArn: tableArn, Tags: tags }))
      .catch(errHandler);
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

  getEcsTaskDefinition = async ({ ecsTaskDefinitionFamily }: { ecsTaskDefinitionFamily: string }) => {
    const errHandler = this.#getErrorHandler('Failed to get ECS task definition with tags.');
    return this.#ecs()
      .send(new DescribeTaskDefinitionCommand({ taskDefinition: ecsTaskDefinitionFamily, include: ['TAGS'] }))
      .catch(errHandler);
  };

  getEcsService = async ({ serviceArn }: { serviceArn: string }) => {
    const errHandler = this.#getErrorHandler('Failed to get ECS Service information');
    const ecsClusterName = serviceArn.split('/')[1];
    const { services: [service] = [] } = await this.#ecs()
      .send(new DescribeServicesCommand({ services: [serviceArn], cluster: ecsClusterName }))
      .catch(errHandler);
    return service;
  };

  getLambdaTags = async ({ lambdaArn }: { lambdaArn: string }) => {
    const errHandler = this.#getErrorHandler('Failed to get lambda tags.');
    return (
      (
        await this.#lambda()
          .send(new ListTagsCommand({ Resource: lambdaArn }))
          .catch(errHandler)
      ).Tags || {}
    );
  };

  tagLambdaFunction = async ({ lambdaArn, tags }: { lambdaArn: string; tags: { key: string; value: string }[] }) => {
    const errHandler = this.#getErrorHandler('Failed to tag lambda.');
    const tagObject = {};
    tags.forEach(({ key, value }) => {
      tagObject[key] = value;
    });
    return this.#lambda()
      .send(
        new TagLambdaResource({
          Resource: lambdaArn,
          Tags: tagObject
        })
      )
      .catch(errHandler);
  };

  registerEcsTaskDefinition = async ({
    cloudformationEcsTaskDefinition
  }: {
    cloudformationEcsTaskDefinition: TaskDefinition;
  }) => {
    const errHandler = this.#getErrorHandler('Failed to register new ECS task definition.');
    const lowerCasedProps = serialize(lowerCaseFirstCharacterOfObjectKeys(cloudformationEcsTaskDefinition.Properties));
    return (await this.#ecs().send(new RegisterTaskDefinitionCommand(lowerCasedProps)).catch(errHandler))
      .taskDefinition;
  };

  startEcsServiceCodeDeployUpdate = async (parameters: CreateDeploymentCommandInput) => {
    const errHandler = this.#getErrorHandler('Failed to start the update of ECS service (using CodeDeploy).');
    return this.#codedeploy()
      .send(new CreateDeploymentCommand({ ...parameters }))
      .catch(errHandler);
  };

  waitForEcsServiceCodeDeployUpdateToFinish = async ({ deploymentId }: { deploymentId: string }) => {
    const errHandler = this.#getErrorHandler(`CodeDeploy ECS service deployment ${deploymentId} failed.`);

    await waitUntilDeploymentSuccessful(
      { client: this.#codedeploy(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
      { deploymentId }
    ).catch((err) => {
      let error = err;
      try {
        const parsedError = JSON.parse(`${err}`.slice(7));
        if (parsedError.result.reason.deploymentInfo.errorInformation) {
          error = new Error(
            `[${parsedError.result.reason.deploymentInfo.errorInformation.code}]: ${parsedError.result.reason.deploymentInfo.errorInformation.message}`
          );
        }
        // if we were not able to parse out error, just use original error
      } catch {}
      errHandler(error);
    });
  };

  startEcsServiceRollingUpdate = async (parameters: UpdateServiceCommandInput) => {
    const errHandler = this.#getErrorHandler('Failed to start the update of ECS service.');
    await this.#ecs()
      .send(new UpdateServiceCommand({ ...parameters }))
      .catch(errHandler);
  };

  waitForEcsServiceRollingUpdateToFinish = async ({ ecsServiceArn }: { ecsServiceArn: string }) => {
    const errHandler = this.#getErrorHandler(`ECS service ${ecsServiceArn} failed to update.`);
    // wait for 2 seconds before starting to poll to make sure that process has started
    let targetDeploymentId: string;
    await wait(2000);
    const ecsClusterName = ecsServiceArn.split('/')[1];
    const waiterInput: DescribeServicesCommandInput = { services: [ecsServiceArn], cluster: ecsClusterName };
    const waiterResult = await createWaiter(
      { client: this.#ecs(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
      waiterInput,
      async (ecsCli, input) => {
        const serviceState = await ecsCli.send(new DescribeServicesCommand(input));
        // this assumes there cannot be more than one primary deployments
        // I was not able to find information on that but it makes sense
        const targetedDeployment = targetDeploymentId
          ? serviceState.services[0].deployments.find(({ id }) => id === targetDeploymentId)
          : serviceState.services[0].deployments.find(({ status }) => status === 'PRIMARY');

        if (!targetedDeployment) {
          return {
            state: WaiterState.RETRY,
            reason: `ECS service ${ecsServiceArn} update in progress.`
          };
        }
        targetDeploymentId = targetedDeployment.id;

        // this waiter conditions are motivated by https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk/lib/api/hotswap/ecs-services.ts
        const failure =
          (targetedDeployment.rolloutState === DeploymentRolloutState.FAILED
            ? targetedDeployment.rolloutStateReason
            : undefined) ||
          serviceState.failures?.find(({ reason }) => reason === 'MISSING')?.detail ||
          serviceState.services?.find(({ status }) => status === 'DRAINING')?.status ||
          serviceState.services?.find(({ status }) => status === 'INACTIVE')?.status;

        if (failure) {
          return {
            state: WaiterState.FAILURE,
            reason: `ECS service ${ecsServiceArn} failed to update. Reason: ${failure}`
          };
        }

        // this is alternative condition which is more robust and waits for compute resource (service) to fully stabilize
        // it waits for deployment to complete end even waits for health-checks, more info https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html
        // on the other hand, it takes more than double the time, than looking only at "desired" vs "running" count (which we are currently doing)
        // if (targetedDeployment.rolloutState === DeploymentRolloutState.COMPLETED)
        if (targetedDeployment.desiredCount && targetedDeployment.runningCount === targetedDeployment.desiredCount) {
          return {
            state: WaiterState.SUCCESS,
            reason: `ECS service ${ecsServiceArn} updated successfully.`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: `ECS service ${ecsServiceArn} update in progress.`
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errHandler(new Error(waiterResult.reason));
    }
  };

  waitUntilFunctionIsUpdated = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errHandler = this.#getErrorHandler(
      `Failure when waiting for update of lambda function ${lambdaResourceName}.`
    );
    await waitUntilFunctionUpdated(
      { client: this.#lambda(), maxWaitTime: 120 },
      { FunctionName: lambdaResourceName }
    ).catch(errHandler);
  };

  publishFunctionVersion = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errHandler = this.#getErrorHandler(`Failure when publishing lambda function ${lambdaResourceName} version.`);
    return this.#lambda()
      .send(new PublishVersionCommand({ FunctionName: lambdaResourceName }))
      .catch(errHandler);
  };

  updateFunctionAlias = async ({
    lambdaResourceName,
    aliasName,
    version
  }: {
    lambdaResourceName: string;
    aliasName: string;
    version: string;
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failure when updating lambda function ${lambdaResourceName} alias ${aliasName}.`
    );
    return this.#lambda()
      .send(new UpdateAliasCommand({ FunctionName: lambdaResourceName, Name: aliasName, FunctionVersion: version }))
      .catch(errHandler);
  };

  listTopLevelDomainPrices = async () => {
    const errHandler = this.#getErrorHandler('Failed to list Route53 domain TLDs.');
    let { Prices, NextPageMarker } = await this.#route53Domains()
      .send(new ListPricesCommand({ MaxItems: 100 }))
      .catch(errHandler);
    let result: DomainPrice[] = Prices;
    while (NextPageMarker) {
      ({ Prices, NextPageMarker } = await this.#route53Domains()
        .send(new ListPricesCommand({ MaxItems: 100, Marker: NextPageMarker }))
        .catch(errHandler));
      result = result.concat(Prices);
    }
    return result;
  };

  getSesIdentitiesStatus = async ({ identities }: { identities: string[] }) => {
    const errHandler = this.#getErrorHandler('Failure when listing AWS SES identities status');
    const { VerificationAttributes } = await this.#ses()
      .send(new GetIdentityVerificationAttributesCommand({ Identities: identities }))
      .catch(errHandler);
    return VerificationAttributes;
  };

  verifyDomainForSesUsingDkim = async ({ domainName }: { domainName: string }) => {
    const errHandler = this.#getErrorHandler(`Failure when verifying domain ${domainName} for SES using DKIM.`);
    const result = await this.#ses()
      .send(new VerifyDomainDkimCommand({ Domain: domainName }))
      .catch(errHandler);
    return result.DkimTokens;
  };

  getSesAccountDetail = async () => {
    const errHandler = this.#getErrorHandler('Unable to get information about AWS SES account');
    return this.#sesv2().send(new GetAccountCommand({})).catch(errHandler);
  };

  createDkimAuthenticationRecordInHostedZone = async ({
    hostedZoneId,
    domainName,
    dkimTokens
  }: {
    hostedZoneId: string;
    domainName: string;
    dkimTokens: string[];
  }) => {
    const errHandler = this.#getErrorHandler(
      `Failed to create certificate validation record for hosted zone ${hostedZoneId}.`
    );
    return this.#route53()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: dkimTokens.map((token) => ({
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: `${token}._domainkey.${domainName}`,
                Type: 'CNAME',
                TTL: 1800,
                ResourceRecords: [{ Value: `${token}.dkim.amazonses.com` }]
              }
            }))
          }
        })
      )
      .catch(errHandler);
  };

  upsertDnsRecordInHostedZone = async ({
    hostedZoneId,
    dnsRecord
  }: {
    hostedZoneId: string;
    dnsRecord: ResourceRecordSet;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to upsert record set in hosted zone ${hostedZoneId}.`);
    return this.#route53()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: dnsRecord
              }
            ]
          }
        })
      )
      .catch(errHandler);
  };

  deleteDnsRecordFromHostedZone = async ({
    hostedZoneId,
    dnsRecord
  }: {
    hostedZoneId: string;
    dnsRecord: ResourceRecordSet;
  }) => {
    const errHandler = this.#getErrorHandler(`Failed to delete record set in hosted zone ${hostedZoneId}.`);
    return this.#route53()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'DELETE',
                ResourceRecordSet: dnsRecord
              }
            ]
          }
        })
      )
      .catch((err) => {
        if (`${err}`.includes('record set') && `${err}`.includes('not found')) {
          return;
        }
        return errHandler(err);
      });
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
              streamName: `${stackName}/${kebabCase('codebuild:deploy' as StacktapeCommand)}/${invocationId}`
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
                  // if you are testing codebuild:deploy prior to releasing 2.0 version uncomment this line and specify stacktape version you wish to use
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
              streamName: `${stackName}/${kebabCase('codebuild:deploy' as StacktapeCommand)}/${invocationId}`
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
                  // eslint-disable-next-line no-template-curly-in-string
                  'if [ -z "${CODEBUILD_ATTEMPT+x}" ]; then export CODEBUILD_ATTEMPT=1; else CODEBUILD_ATTEMPT=$((CODEBUILD_ATTEMPT+1)); export CODEBUILD_ATTEMPT; fi',
                  // eslint-disable-next-line no-template-curly-in-string
                  'echo "Install Phase - Attempt #${CODEBUILD_ATTEMPT}"',
                  'docker run --privileged --rm public.ecr.aws/vend/tonistiigi/binfmt:latest --install arm64',
                  ...additionalInstallCommands,
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
                    // eslint-disable-next-line no-template-curly-in-string
                    '  echo "Install failed on attempt #${CODEBUILD_ATTEMPT}, sleeping 10s before retry…"; ' +
                    '  sleep 10; ' +
                    'fi'
                ]
              },
              build: {
                'on-failure': 'ABORT',
                commands: [
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
          raiseError({
            type: 'CODEBUILD',
            message: `Start of codebuild deployment failed in phase "${
              lastPhase.phaseType
            }" with status before stacktape operation could be started.${
              additionalMessage ? `\nAdditional message: ${additionalMessage}.` : ''
            }`,
            hint: `Deployment logs: ${consoleLinks.codebuildDeployment(
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

  listCodebuildProjectBuilds = async ({
    codebuildProjectName,
    limit = 500,
    nextToken
  }: {
    codebuildProjectName: string;
    // stackName: string;
    limit?: number;
    nextToken?: string;
  }) => {
    const errHandler = this.#getErrorHandler('Unable to list codebuild operations');
    const result: Build[][] = [];
    let amount = 0;
    let builds: Build[];
    // let nextToken:string;
    ({ builds, nextToken } = await this.#codebuild()
      .send(new ListBuildsForProjectCommand({ projectName: codebuildProjectName, nextToken }))
      .then(async ({ ids, nextToken: nt }) => ({
        builds: await this.getCodebuildBuilds({ buildIds: ids }),
        nextToken: nt
      }))
      .catch(errHandler));
    result.push(builds);
    amount += builds?.length || 0;
    while (nextToken && amount < limit) {
      ({ builds, nextToken } = await this.#codebuild()
        .send(new ListBuildsForProjectCommand({ projectName: codebuildProjectName, nextToken }))
        .then(async ({ ids, nextToken: nt }) => ({
          builds: await this.getCodebuildBuilds({ buildIds: ids }),
          nextToken: nt
        }))
        .catch(errHandler));
      result.push(builds);
      amount += builds?.length || 0;
    }
    return { codebuildBuilds: result.flat(), nextToken };
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

  startEcsExecSsmSession = async (startSessionInput: ExecuteCommandCommandInput) => {
    const errHandler = this.#getErrorHandler('Unable to start container session');
    const {
      session: { sessionId, streamUrl, tokenValue }
    } = await this.#ecs()
      .send(new ExecuteCommandCommand(startSessionInput))
      .catch((err) => {
        if (
          `${err}`.includes('The execute command failed because execute command was not enabled when the task was run')
        ) {
          return errHandler(
            new Error(
              'Container sessions are not enabled for this workload. Please set `enableRemoteSessions: true` on your container service definition.'
            )
          );
        }
        return errHandler(err);
      });
    return { SessionId: sessionId, StreamUrl: streamUrl, TokenValue: tokenValue } as StartSessionResponse;
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

  listEcsTasks = async ({
    ecsClusterName,
    desiredStatus
  }: {
    ecsClusterName: string;
    desiredStatus?: DesiredStatus;
  }) => {
    const taskArnsList: string[] = [];
    let { nextToken, taskArns } = await this.#ecs().send(
      new ListTasksCommand({ cluster: ecsClusterName, desiredStatus })
    );
    taskArnsList.push(...taskArns);
    while (nextToken) {
      ({ nextToken, taskArns } = await this.#ecs().send(
        new ListTasksCommand({ cluster: ecsClusterName, nextToken, desiredStatus })
      ));
      taskArnsList.push(...taskArns);
    }
    return (
      await Promise.all(
        chunkArray(taskArnsList, 100).map(async (chunk) =>
          this.#ecs().send(new DescribeTasksCommand({ tasks: chunk, cluster: ecsClusterName }))
        )
      )
    )
      .flat()
      .map(({ tasks }) => {
        return tasks;
      })
      .flat();
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
