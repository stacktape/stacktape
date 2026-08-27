/**
 * The AWS SDK v3 service/operation pairs `aws:call` is allowed to send.
 *
 * This is a name allowlist, not a permission check. `aws:call` prefers the deployed stack's debug role but falls back
 * to the caller's own AWS credentials whenever that role is missing or cannot be assumed, so an operation that gets
 * past this list runs with whatever those credentials happen to allow. The list is the only guard, so it is
 * default-deny: an operation is sent only when it appears under the exact service it was reviewed for, and an
 * unknown service or an unlisted operation is rejected.
 *
 * Reviewed means "returns information and changes nothing an observer would notice". A verb prefix does not decide
 * that, which is why there is no `Get*` rule here: Step Functions `GetActivityTask` claims a task, records
 * `ActivityStarted`, starts the task's timeout and can take work away from the worker that should have had it. The
 * same reasoning keeps out SQS `ReceiveMessage` (hides messages behind a visibility timeout), CloudWatch Logs
 * `StartQuery` and CloudFormation `DetectStackDrift` (start billable server-side jobs), STS `GetSessionToken` and ECR
 * `GetAuthorizationToken` (mint credentials), X-Ray `GetSamplingTargets` (reports sampling usage), and DynamoDB
 * `ExecuteStatement` (PartiQL, which writes).
 *
 * Coverage is deliberately partial. A genuinely read-only operation that is missing is rejected until someone reviews
 * it and adds it here, which is the failure this file prefers.
 */

/**
 * Canonical service name to the operations reviewed as read-only for it. Operation names are the SDK's, without the
 * `Command` suffix, and are matched case-sensitively — the same spelling the executor resolves the command class by.
 */
export const AWS_READ_ONLY_OPERATIONS = {
  acm: ['DescribeCertificate', 'GetCertificate', 'ListCertificates', 'ListTagsForCertificate'],
  apigatewayv2: [
    'GetApi',
    'GetApis',
    'GetAuthorizers',
    'GetDomainNames',
    'GetIntegration',
    'GetIntegrations',
    'GetRoute',
    'GetRoutes',
    'GetStage',
    'GetStages'
  ],
  autoscaling: [
    'DescribeAutoScalingGroups',
    'DescribeAutoScalingInstances',
    'DescribePolicies',
    'DescribeScalingActivities'
  ],
  budgets: ['DescribeBudget', 'DescribeBudgets'],
  cloudformation: [
    'DescribeChangeSet',
    'DescribeStackEvents',
    'DescribeStackResource',
    'DescribeStackResources',
    'DescribeStacks',
    'GetTemplate',
    'ListChangeSets',
    'ListStackResources',
    'ListStacks'
  ],
  cloudfront: ['GetDistribution', 'GetDistributionConfig', 'GetInvalidation', 'ListDistributions', 'ListInvalidations'],
  cloudwatch: [
    'DescribeAlarmHistory',
    'DescribeAlarms',
    'GetDashboard',
    'GetMetricData',
    'GetMetricStatistics',
    'ListDashboards',
    'ListMetrics'
  ],
  codebuild: ['BatchGetBuilds', 'BatchGetProjects', 'ListBuilds', 'ListBuildsForProject', 'ListProjects'],
  codedeploy: [
    'BatchGetDeployments',
    'GetApplication',
    'GetDeployment',
    'GetDeploymentGroup',
    'ListApplications',
    'ListDeploymentGroups',
    'ListDeployments'
  ],
  cognito: [
    'AdminGetUser',
    'DescribeUserPool',
    'DescribeUserPoolClient',
    'DescribeUserPoolDomain',
    'ListGroups',
    'ListUserPoolClients',
    'ListUserPools',
    'ListUsers'
  ],
  // Cost Explorer reads are billed per request, which is a cost and not a state change.
  costexplorer: ['GetCostAndUsage', 'GetCostForecast', 'GetDimensionValues'],
  dynamodb: [
    'BatchGetItem',
    'DescribeContinuousBackups',
    'DescribeTable',
    'DescribeTimeToLive',
    'GetItem',
    'ListTables',
    'ListTagsOfResource',
    'Query',
    'Scan'
  ],
  ec2: [
    'DescribeAddresses',
    'DescribeAvailabilityZones',
    'DescribeImages',
    'DescribeInstanceStatus',
    'DescribeInstances',
    'DescribeInternetGateways',
    'DescribeNatGateways',
    'DescribeNetworkInterfaces',
    'DescribeRouteTables',
    'DescribeSecurityGroupRules',
    'DescribeSecurityGroups',
    'DescribeSubnets',
    'DescribeVolumes',
    'DescribeVpcEndpoints',
    'DescribeVpcs'
  ],
  ecr: [
    'BatchGetImage',
    'DescribeImages',
    'DescribeRegistry',
    'DescribeRepositories',
    'GetRepositoryPolicy',
    'ListImages',
    'ListTagsForResource'
  ],
  ecs: [
    'DescribeClusters',
    'DescribeContainerInstances',
    'DescribeServices',
    'DescribeTaskDefinition',
    'DescribeTasks',
    'ListClusters',
    'ListContainerInstances',
    'ListServices',
    'ListTaskDefinitions',
    'ListTasks'
  ],
  elbv2: [
    'DescribeListeners',
    'DescribeLoadBalancerAttributes',
    'DescribeLoadBalancers',
    'DescribeRules',
    'DescribeTargetGroupAttributes',
    'DescribeTargetGroups',
    'DescribeTargetHealth'
  ],
  eventbridge: [
    'DescribeEventBus',
    'DescribeRule',
    'ListEventBuses',
    'ListRuleNamesByTarget',
    'ListRules',
    'ListTargetsByRule'
  ],
  firehose: ['DescribeDeliveryStream', 'ListDeliveryStreams', 'ListTagsForDeliveryStream'],
  iam: [
    'GetInstanceProfile',
    'GetPolicy',
    'GetPolicyVersion',
    'GetRole',
    'GetRolePolicy',
    'ListAttachedRolePolicies',
    'ListPolicies',
    'ListPolicyVersions',
    'ListRolePolicies',
    'ListRoles'
  ],
  // `GetRecords` reads the stream without acknowledging or removing anything; Kinesis has no per-consumer claim.
  kinesis: ['DescribeStream', 'DescribeStreamSummary', 'GetRecords', 'GetShardIterator', 'ListShards', 'ListStreams'],
  lambda: [
    'GetAccountSettings',
    'GetAlias',
    'GetEventSourceMapping',
    'GetFunction',
    'GetFunctionConcurrency',
    'GetFunctionConfiguration',
    'GetFunctionUrlConfig',
    'GetLayerVersion',
    'GetPolicy',
    'ListAliases',
    'ListEventSourceMappings',
    'ListFunctionUrlConfigs',
    'ListFunctions',
    'ListLayerVersions',
    'ListLayers',
    'ListTags',
    'ListVersionsByFunction'
  ],
  logs: [
    'DescribeLogGroups',
    'DescribeLogStreams',
    'DescribeMetricFilters',
    'DescribeQueries',
    'DescribeSubscriptionFilters',
    'FilterLogEvents',
    'GetLogEvents',
    'GetQueryResults',
    // Logs Insights reads: starting/stopping a query mutates nothing but the query job itself.
    'StartQuery',
    'StopQuery'
  ],
  opensearch: ['DescribeDomain', 'DescribeDomainConfig', 'DescribeDomains', 'ListDomainNames'],
  rds: [
    'DescribeDBClusterSnapshots',
    'DescribeDBClusters',
    'DescribeDBEngineVersions',
    'DescribeDBInstances',
    'DescribeDBParameterGroups',
    'DescribeDBSnapshots',
    'DescribeDBSubnetGroups'
  ],
  route53: ['GetChange', 'GetHostedZone', 'ListHostedZones', 'ListHostedZonesByName', 'ListResourceRecordSets'],
  s3: [
    'GetBucketEncryption',
    'GetBucketLocation',
    'GetBucketPolicy',
    'GetBucketTagging',
    'GetBucketVersioning',
    'GetBucketWebsite',
    'GetObject',
    'GetObjectAttributes',
    'GetPublicAccessBlock',
    'HeadBucket',
    'HeadObject',
    'ListBuckets',
    'ListObjectVersions',
    'ListObjectsV2'
  ],
  secretsmanager: ['DescribeSecret', 'GetResourcePolicy', 'GetSecretValue', 'ListSecretVersionIds', 'ListSecrets'],
  ses: [
    'GetIdentityDkimAttributes',
    'GetIdentityVerificationAttributes',
    'GetSendQuota',
    'GetSendStatistics',
    'ListIdentities'
  ],
  sesv2: ['GetAccount', 'GetConfigurationSet', 'GetEmailIdentity', 'ListConfigurationSets', 'ListEmailIdentities'],
  servicediscovery: [
    'DiscoverInstances',
    'GetInstance',
    'GetNamespace',
    'GetService',
    'ListInstances',
    'ListNamespaces',
    'ListServices'
  ],
  // Deliberately without `GetActivityTask`: it claims a task and starts its timeout.
  sfn: [
    'DescribeActivity',
    'DescribeExecution',
    'DescribeMapRun',
    'DescribeStateMachine',
    'DescribeStateMachineForExecution',
    'GetExecutionHistory',
    'ListActivities',
    'ListExecutions',
    'ListMapRuns',
    'ListStateMachines',
    'ListTagsForResource'
  ],
  sns: [
    'GetSubscriptionAttributes',
    'GetTopicAttributes',
    'ListSubscriptions',
    'ListSubscriptionsByTopic',
    'ListTagsForResource',
    'ListTopics'
  ],
  // Deliberately without `ReceiveMessage`: it hides the messages it returns from the real consumer.
  sqs: ['GetQueueAttributes', 'GetQueueUrl', 'ListDeadLetterSourceQueues', 'ListQueueTags', 'ListQueues'],
  ssm: [
    'DescribeParameters',
    'GetParameter',
    'GetParameterHistory',
    'GetParameters',
    'GetParametersByPath',
    'ListTagsForResource'
  ],
  sts: ['GetCallerIdentity'],
  wafv2: ['GetIPSet', 'GetWebACL', 'ListIPSets', 'ListRuleGroups', 'ListWebACLs'],
  synthetics: ['DescribeCanaries', 'DescribeCanariesLastRun', 'GetCanary', 'GetCanaryRuns'],
  xray: ['BatchGetTraces', 'GetServiceGraph', 'GetTraceGraph', 'GetTraceSegmentDestination', 'GetTraceSummaries']
} as const satisfies Record<string, readonly string[]>;

export type AwsReadOnlyService = keyof typeof AWS_READ_ONLY_OPERATIONS;

/**
 * Alternate service spellings `aws:call` has always accepted, each pointing at the canonical name above rather than
 * repeating its operations.
 */
const SERVICE_ALIASES: Record<string, AwsReadOnlyService> = {
  elb: 'elbv2',
  events: 'eventbridge',
  stepfunctions: 'sfn'
};

/** The canonical name for a user-supplied service, or `undefined` when `aws:call` supports no operation for it. */
export const resolveAwsServiceName = (service: string): AwsReadOnlyService | undefined => {
  // `Object.hasOwn`, not `in`: the name comes from a CLI flag, and `in` also answers yes for `constructor`.
  const name = service.toLowerCase();

  if (Object.hasOwn(AWS_READ_ONLY_OPERATIONS, name)) return name as AwsReadOnlyService;

  return Object.hasOwn(SERVICE_ALIASES, name) ? SERVICE_ALIASES[name] : undefined;
};

/** The operations accepted for a service, aliases included; empty for a service `aws:call` does not support. */
export const getReadOnlyAwsOperations = (service: string): readonly string[] => {
  const canonical = resolveAwsServiceName(service);

  return canonical ? AWS_READ_ONLY_OPERATIONS[canonical] : [];
};

export const isReadOnlyAwsCommand = (service: string, command: string): boolean => {
  // The executor accepts both `GetItem` and `GetItemCommand`, so judge the same name it will resolve.
  const operation = command.endsWith('Command') ? command.slice(0, -'Command'.length) : command;

  return getReadOnlyAwsOperations(service).includes(operation);
};
