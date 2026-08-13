import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { SourceAccessConfiguration } from '@stacktape/cloudformation/resources/aws-lambda-eventsourcemapping';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join, ref, select, split } from '@stacktape/cloudformation/intrinsics';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { getPropsOfResourceReferencedInConfig } from '@domain-services/config-manager/utils/resource-references';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { KafkaTopicIntegration, KafkaTopicIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { CliError } from '@utils/errors';
import { createHash } from 'node:crypto';
import { isDevCommand } from '../../../../../../commands/dev/dev-mode-utils';
import { getRemoteResourceNames } from '../../../../../../commands/dev/local-resources';

const fail = (code: string, message: string, hints?: string): never => {
  throw new CliError({ category: 'CONFIG_VALIDATION', code, message, hints });
};

const getStableEventKey = (event: KafkaTopicIntegrationProps) => {
  const source =
    'kafkaClusterName' in event && event.kafkaClusterName
      ? `stacktape:${event.kafkaClusterName}`
      : 'mskClusterArn' in event && event.mskClusterArn
        ? `msk:${event.mskClusterArn}`
        : `custom:${event.customKafkaConfiguration.bootstrapServers.join(',')}`;
  const topic = 'topicName' in event && event.topicName ? event.topicName : event.customKafkaConfiguration.topicName;
  return createHash('sha256')
    .update(`${source}:${topic}:${event.consumerGroupId || 'aws-assigned-group'}`)
    .digest('hex')
    .slice(0, 12);
};

const getKafkaDataPlaneArn = ({
  clusterArn,
  resourceType,
  resourceName
}: {
  clusterArn: string | Intrinsic;
  resourceType: 'topic' | 'group';
  resourceName: string;
}) =>
  join('', [
    `arn:aws:kafka:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:${resourceType}/`,
    select(1, split('/', clusterArn)),
    '/',
    select(2, split('/', clusterArn)),
    `/${resourceName}`
  ]) as unknown as string;

export const validateKafkaSecretArn = (functionName: string, arn: string) => {
  const match = arn.match(/^arn:(aws(?:-us-gov|-cn)?):secretsmanager:([^:]+):(\d{12}):secret:[A-Za-z0-9/_+=.@-]+$/);
  if (!match || arn.length > 200 || match[2] !== calculatedStackOverviewManager.context.region) {
    fail(
      'CONFIG_KAFKA_SECRET_ARN_INVALID',
      `Kafka event on function \`${functionName}\` has invalid Secrets Manager ARN \`${arn}\`.`,
      `Use a concrete secret ARN without wildcards from deployment region \`${calculatedStackOverviewManager.context.region}\`.`
    );
  }
};

export const validateKafkaEventOptions = (functionName: string, event: KafkaTopicIntegrationProps) => {
  const sourceCount = [
    'kafkaClusterName' in event && !!event.kafkaClusterName,
    'mskClusterArn' in event && !!event.mskClusterArn,
    'customKafkaConfiguration' in event && !!event.customKafkaConfiguration
  ].filter(Boolean).length;
  if (sourceCount !== 1)
    fail(
      'CONFIG_KAFKA_SOURCE_EXACTLY_ONE',
      `Kafka event on function \`${functionName}\` requires exactly one source: \`kafkaClusterName\`, \`mskClusterArn\`, or \`customKafkaConfiguration\`.`
    );
  if ('customKafkaConfiguration' in event && event.customKafkaConfiguration) {
    const { bootstrapServers, authentication } = event.customKafkaConfiguration;
    const invalidBroker = bootstrapServers?.find((broker) => {
      const match = broker.match(
        /^(([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]):(\d{1,5})$/
      );
      return broker.length > 300 || !match || Number(match[4]) < 1 || Number(match[4]) > 65_535;
    });
    if (!bootstrapServers || bootstrapServers.length < 1 || bootstrapServers.length > 10 || invalidBroker) {
      fail(
        'CONFIG_KAFKA_BOOTSTRAP_SERVERS_INVALID',
        `Kafka event on function \`${functionName}\` has invalid \`bootstrapServers\`.`,
        'Provide 1-10 broker addresses in `hostname:port` form; each address can be at most 300 characters.'
      );
    }
    const authenticationSecretArns =
      authentication.type === 'MTLS'
        ? [authentication.properties.clientCertificate, authentication.properties.serverRootCaCertificate].filter(
            (arn): arn is string => !!arn
          )
        : [authentication.properties.authenticationSecretArn];
    authenticationSecretArns.forEach((arn) => validateKafkaSecretArn(functionName, arn));
    const vpc = 'vpc' in event ? event.vpc : undefined;
    if (
      vpc &&
      (!vpc.subnetIds?.length ||
        !vpc.securityGroupIds?.length ||
        vpc.subnetIds.length +
          vpc.securityGroupIds.length +
          (authentication.type === 'MTLS' && authentication.properties.serverRootCaCertificate ? 2 : 1) >
          22)
    ) {
      fail(
        'CONFIG_KAFKA_VPC_ACCESS_INVALID',
        `Kafka event on function \`${functionName}\` has invalid \`vpc\` source-access configuration.`,
        'Provide at least one subnet and security group, with no more than 22 total authentication, subnet, and security-group entries.'
      );
    }
  }
  if (event.startFrom !== 'latest' && event.startFrom !== 'earliest')
    fail(
      'CONFIG_KAFKA_START_POSITION_REQUIRED',
      `Kafka event on function \`${functionName}\` requires \`startFrom: latest | earliest\`.`
    );
  if (
    event.batchSize !== undefined &&
    (!Number.isInteger(event.batchSize) || event.batchSize < 1 || event.batchSize > 10_000)
  ) {
    fail(
      'CONFIG_KAFKA_BATCH_SIZE_INVALID',
      `Kafka event on function \`${functionName}\` has invalid \`batchSize\`.`,
      'Use an integer from 1 through 10000.'
    );
  }
  if (
    event.maxBatchWindowSeconds !== undefined &&
    (!Number.isInteger(event.maxBatchWindowSeconds) ||
      event.maxBatchWindowSeconds < 0 ||
      event.maxBatchWindowSeconds > 300)
  ) {
    fail(
      'CONFIG_KAFKA_BATCH_WINDOW_INVALID',
      `Kafka event on function \`${functionName}\` has invalid \`maxBatchWindowSeconds\`.`,
      'Use an integer from 0 through 300, or omit it for the AWS 500 ms default.'
    );
  }
  const topicName =
    'customKafkaConfiguration' in event && event.customKafkaConfiguration
      ? event.customKafkaConfiguration.topicName
      : 'topicName' in event
        ? event.topicName
        : undefined;
  if (!topicName || topicName.length > 249 || !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(topicName)) {
    fail(
      'CONFIG_KAFKA_TOPIC_NAME_INVALID',
      `Kafka event on function \`${functionName}\` has invalid topic name \`${topicName || ''}\`.`,
      'Use 1-249 letters, numbers, periods, underscores, or hyphens; do not start with a period.'
    );
  }
  if (
    event.consumerGroupId !== undefined &&
    (event.consumerGroupId.length < 1 ||
      event.consumerGroupId.length > 200 ||
      !/^[A-Za-z0-9/\:_+=.@-]+$/.test(event.consumerGroupId))
  ) {
    fail(
      'CONFIG_KAFKA_CONSUMER_GROUP_INVALID',
      `Kafka event on function \`${functionName}\` has invalid \`consumerGroupId\`.`,
      'Use 1-200 Kafka group ID characters. Wildcards are not accepted because IAM access is scoped to this exact ID.'
    );
  }
};

export const validateExistingMskArn = (arn: string) => {
  const match = arn.match(
    /^arn:(aws(?:-us-gov|-cn)?):kafka:([^:]+):(\d{12}):cluster\/[A-Za-z0-9._-]{1,64}\/[A-Za-z0-9-]+$/
  );
  if (
    !match ||
    match[2] !== calculatedStackOverviewManager.context.region ||
    match[3] !== calculatedStackOverviewManager.context.accountId
  ) {
    fail(
      'CONFIG_KAFKA_MSK_ARN_INVALID',
      `Existing MSK ARN \`${arn}\` must identify a cluster in deployment account \`${calculatedStackOverviewManager.context.accountId}\` and region \`${calculatedStackOverviewManager.context.region}\`.`,
      'Cross-account MSK event sources require a separate VPC connection and are not supported by this event contract.'
    );
  }
};

export const getKafkaEventSourceMappingLogicalName = ({
  event,
  eventIndex,
  functionName
}: {
  event: KafkaTopicIntegrationProps;
  eventIndex: number;
  functionName: string;
}) =>
  'customKafkaConfiguration' in event && event.customKafkaConfiguration
    ? cfLogicalNames.eventSourceMapping(functionName, eventIndex)
    : cfLogicalNames.kafkaEventSourceMapping(functionName, getStableEventKey(event));

export const validateNativeKafkaTriggerVpc = ({ reusedVpc }: { reusedVpc: boolean }) => {
  if (reusedVpc) {
    fail(
      'CONFIG_KAFKA_REUSED_VPC_TRIGGER_UNSUPPORTED',
      'Kafka topic events for a Stacktape Kafka cluster cannot use a reused VPC in this version.',
      'Lambda and STS private-DNS endpoints are VPC-global and may already be owned by another stack. Use the cluster from a deployed direct client, use an existing MSK ARN with networking you manage, or deploy the native cluster in a Stacktape-owned VPC outside us-east-1.'
    );
  }
};

export const validateKafkaEventsForFunction = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const explicitConsumerGroups = new Set<string>();
  const mappingIdentities = new Set<string>();
  (lambdaFunction.events || []).forEach((event) => {
    if (event.type !== 'kafka-topic') return;
    const details = event.properties;
    validateKafkaEventOptions(lambdaFunction.name, details);
    if ((lambdaFunction.timeout || 0) > 840) {
      fail(
        'CONFIG_KAFKA_FUNCTION_TIMEOUT_INVALID',
        `Function \`${lambdaFunction.name}\` has a Kafka event and a timeout longer than 840 seconds.`,
        'AWS limits functions with Kafka event sources to 14 minutes. Set `timeout` to 840 or less.'
      );
    }
    if (details.consumerGroupId) {
      if (explicitConsumerGroups.has(details.consumerGroupId))
        fail(
          'CONFIG_KAFKA_CONSUMER_GROUP_DUPLICATE',
          `Function \`${lambdaFunction.name}\` uses consumer group \`${details.consumerGroupId}\` for more than one Kafka event.`,
          'Use a distinct group for each topic event so one mapping cannot steal partitions from another.'
        );
      explicitConsumerGroups.add(details.consumerGroupId);
    }
    const mappingIdentity = getStableEventKey(details);
    if (mappingIdentities.has(mappingIdentity)) {
      fail(
        'CONFIG_KAFKA_EVENT_DUPLICATE',
        `Function \`${lambdaFunction.name}\` defines the same Kafka source, topic, and consumer group more than once.`,
        'Remove the duplicate event or use a distinct explicit `consumerGroupId`.'
      );
    }
    mappingIdentities.add(mappingIdentity);
    if ('mskClusterArn' in details && details.mskClusterArn) validateExistingMskArn(details.mskClusterArn);
  });
};

export const resolveKafkaTopicEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  validateKafkaEventsForFunction({ lambdaFunction });
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const statements: StpIamRoleStatement[] = [];
  const lambdaEndpointArn = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');
  const managedClusterArns = new Map<string, string | Intrinsic>();
  const topicArns = new Map<string, string>();
  const groupArns = new Map<string, string>();
  const secretArns = new Set<string>();
  let needsEc2Access = false;

  (events || []).forEach((event: KafkaTopicIntegration, eventIndex) => {
    if (event.type !== 'kafka-topic') return;
    const details = event.properties;

    if ('kafkaClusterName' in details && details.kafkaClusterName) {
      const cluster = getPropsOfResourceReferencedInConfig({
        stpResourceReference: details.kafkaClusterName,
        stpResourceType: 'kafka-cluster',
        referencedFrom: name,
        referencedFromType: lambdaFunction.configParentResourceType
      });
      if (isDevCommand() && !getRemoteResourceNames().has(details.kafkaClusterName)) return;
      validateNativeKafkaTriggerVpc({ reusedVpc: !!configManager.reuseVpcConfig });
      const clusterArn = ref(cfLogicalNames.kafkaServerlessCluster(cluster.name));
      managedClusterArns.set(details.kafkaClusterName, clusterArn);
      topicArns.set(
        `${details.kafkaClusterName}:${details.topicName}`,
        getKafkaDataPlaneArn({ clusterArn, resourceType: 'topic', resourceName: details.topicName })
      );
      groupArns.set(
        `${details.kafkaClusterName}:${details.consumerGroupId || '*'}`,
        getKafkaDataPlaneArn({ clusterArn, resourceType: 'group', resourceName: details.consumerGroupId || '*' })
      );
      needsEc2Access = true;
    } else if ('mskClusterArn' in details && details.mskClusterArn) {
      managedClusterArns.set(details.mskClusterArn, details.mskClusterArn);
      topicArns.set(
        `${details.mskClusterArn}:${details.topicName}`,
        getKafkaDataPlaneArn({
          clusterArn: details.mskClusterArn,
          resourceType: 'topic',
          resourceName: details.topicName
        })
      );
      groupArns.set(
        `${details.mskClusterArn}:${details.consumerGroupId || '*'}`,
        getKafkaDataPlaneArn({
          clusterArn: details.mskClusterArn,
          resourceType: 'group',
          resourceName: details.consumerGroupId || '*'
        })
      );
      needsEc2Access = true;
    } else if (!('customKafkaConfiguration' in details) || !details.customKafkaConfiguration) {
      fail(
        'CONFIG_KAFKA_SOURCE_REQUIRED',
        `Kafka event on function \`${name}\` requires exactly one source: \`kafkaClusterName\`, \`mskClusterArn\`, or \`customKafkaConfiguration\`.`
      );
    } else {
      const auth = details.customKafkaConfiguration.authentication;
      const eventSecretArns =
        auth.type === 'MTLS'
          ? ([auth.properties.clientCertificate, auth.properties.serverRootCaCertificate].filter(Boolean) as string[])
          : [auth.properties.authenticationSecretArn];
      eventSecretArns.forEach((arn) => secretArns.add(arn));
      if ('vpc' in details && details.vpc) needsEc2Access = true;
    }

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: getKafkaEventSourceMappingLogicalName({ event: details, eventIndex, functionName: name }),
      nameChain,
      resource: getEventSourceMapping({ eventDetails: details, lambdaEndpointArn })
    });
  });
  const clusterArns = [...managedClusterArns.values()] as string[];
  if (clusterArns.length) {
    statements.push(
      { Effect: 'Allow', Action: ['kafka:DescribeClusterV2'], Resource: clusterArns },
      { Effect: 'Allow', Action: ['kafka:GetBootstrapBrokers'], Resource: ['*'] },
      { Effect: 'Allow', Action: ['kafka-cluster:Connect'], Resource: clusterArns },
      {
        Effect: 'Allow',
        Action: ['kafka-cluster:DescribeTopic', 'kafka-cluster:ReadData'],
        Resource: [...topicArns.values()]
      },
      {
        Effect: 'Allow',
        Action: ['kafka-cluster:DescribeGroup', 'kafka-cluster:AlterGroup'],
        Resource: [...groupArns.values()]
      }
    );
  }
  if (secretArns.size)
    statements.push({ Effect: 'Allow', Action: ['secretsmanager:GetSecretValue'], Resource: [...secretArns] });
  if (needsEc2Access)
    statements.push({
      Effect: 'Allow',
      Action: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeVpcs',
        'ec2:DeleteNetworkInterface',
        'ec2:DescribeSubnets',
        'ec2:DescribeSecurityGroups'
      ],
      Resource: ['*']
    });
  return statements;
};

export const getEventSourceMapping = ({
  lambdaEndpointArn,
  eventDetails
}: {
  eventDetails: KafkaTopicIntegrationProps;
  lambdaEndpointArn: string | Intrinsic;
}) => {
  const accessConfigurations: SourceAccessConfiguration[] = [];
  let eventSourceArn: string | Intrinsic | undefined;
  let selfManagedEventSource: { Endpoints: { KafkaBootstrapServers: string[] } } | undefined;
  let topicName: string;

  if ('kafkaClusterName' in eventDetails && eventDetails.kafkaClusterName) {
    const cluster = getPropsOfResourceReferencedInConfig({
      stpResourceReference: eventDetails.kafkaClusterName,
      stpResourceType: 'kafka-cluster',
      referencedFrom: 'kafka event'
    });
    eventSourceArn = ref(cfLogicalNames.kafkaServerlessCluster(cluster.name));
    topicName = eventDetails.topicName;
  } else if ('mskClusterArn' in eventDetails && eventDetails.mskClusterArn) {
    eventSourceArn = eventDetails.mskClusterArn;
    topicName = eventDetails.topicName;
  } else {
    const custom = eventDetails.customKafkaConfiguration;
    topicName = custom.topicName;
    selfManagedEventSource = { Endpoints: { KafkaBootstrapServers: custom.bootstrapServers } };
    if (custom.authentication.type === 'MTLS') {
      accessConfigurations.push({
        Type: 'CLIENT_CERTIFICATE_TLS_AUTH',
        URI: custom.authentication.properties.clientCertificate
      });
      if (custom.authentication.properties.serverRootCaCertificate)
        accessConfigurations.push({
          Type: 'SERVER_ROOT_CA_CERTIFICATE',
          URI: custom.authentication.properties.serverRootCaCertificate
        });
    } else
      accessConfigurations.push({
        Type: custom.authentication.type,
        URI: custom.authentication.properties.authenticationSecretArn
      });
    const vpc = 'vpc' in eventDetails ? eventDetails.vpc : undefined;
    vpc?.subnetIds.forEach((subnetId) => accessConfigurations.push({ Type: 'VPC_SUBNET', URI: `subnet:${subnetId}` }));
    vpc?.securityGroupIds.forEach((securityGroupId) =>
      accessConfigurations.push({ Type: 'VPC_SECURITY_GROUP', URI: `security_group:${securityGroupId}` })
    );
  }

  const resource = cfnResource('AWS::Lambda::EventSourceMapping', {
    BatchSize: eventDetails.batchSize,
    MaximumBatchingWindowInSeconds: eventDetails.maxBatchWindowSeconds,
    Enabled: true,
    FunctionName: lambdaEndpointArn,
    EventSourceArn: eventSourceArn,
    SelfManagedEventSource: selfManagedEventSource,
    AmazonManagedKafkaEventSourceConfig:
      eventSourceArn && eventDetails.consumerGroupId ? { ConsumerGroupId: eventDetails.consumerGroupId } : undefined,
    SelfManagedKafkaEventSourceConfig:
      selfManagedEventSource && eventDetails.consumerGroupId
        ? { ConsumerGroupId: eventDetails.consumerGroupId }
        : undefined,
    StartingPosition: eventDetails.startFrom === 'earliest' ? 'TRIM_HORIZON' : 'LATEST',
    Topics: [topicName],
    SourceAccessConfigurations: accessConfigurations.length ? accessConfigurations : undefined
  });
  if ('kafkaClusterName' in eventDetails && eventDetails.kafkaClusterName) {
    resource.DependsOn = [
      cfLogicalNames.kafkaOnDemandVpcEndpoint('lambda'),
      cfLogicalNames.kafkaOnDemandVpcEndpoint('sts')
    ];
  }
  return resource;
};
