import type { MetricTargetType } from './metric-targets';

/**
 * The CloudWatch metrics behind the Console's charts for each metric target, which hosted incident runs read too, so a
 * person and an agent look at the same series. Each chart reads its series by position, so the order of the queries per
 * resource type below is part of the contract: `metrics[0]` is the first query listed here.
 */

/** What the charts can draw. */
export type MetricResourceType = MetricTargetType;

type MetricQueryInput = {
  /**
   * API id, function name, cluster name, DB identifier, user pool id, bucket, table, cluster id, distribution id, queue
   * or topic name, or state machine ARN.
   */
  primaryResourceIdentifier: string;
  /** ECS service name and Cognito user pool client id; unused for the other resource types. */
  secondaryResourceIdentifier?: string;
  period: number;
};

/**
 * The part of CloudWatch's `MetricDataQuery` these queries use. Keys keep the SDK's capitalized spelling so callers
 * pass them straight to `GetMetricData`; the package itself stays free of the AWS SDK dependency.
 */
export type MetricQuery = {
  Id: string;
  MetricStat: {
    Metric: { Namespace: string; MetricName: string; Dimensions: Array<{ Name: string; Value: string }> };
    Period: number;
    Stat: string;
  };
  ReturnData?: boolean;
};

/**
 * Names one namespace and dimension set, so every metric below reads as `id ← AWS metric (statistic)`. `ReturnData`
 * is only written when a query sets it, keeping the request identical to the one the Console has always sent.
 */
const metricsOf =
  ({
    namespace,
    dimensions,
    period
  }: {
    namespace: string;
    dimensions: Array<{ Name: string; Value: string }>;
    period: number;
  }) =>
  (id: string, metricName: string, stat: string, returnData?: boolean): MetricQuery => ({
    Id: id,
    MetricStat: {
      Metric: { Namespace: namespace, MetricName: metricName, Dimensions: dimensions },
      Period: period,
      Stat: stat
    },
    ...(returnData === undefined ? {} : { ReturnData: returnData })
  });

const metricQueriesByResourceType: Record<MetricResourceType, (input: MetricQueryInput) => MetricQuery[]> = {
  apigateway: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/ApiGateway',
      dimensions: [{ Name: 'ApiId', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('requestCount', 'Count', 'SampleCount'),
      metric('errors', '5xx', 'Average'),
      metric('latency_metric', 'Latency', 'Average')
    ];
  },

  alb: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/ApplicationELB',
      dimensions: [{ Name: 'LoadBalancer', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('requestCount', 'RequestCount', 'Sum'),
      metric('errors', 'HTTPCode_Target_5XX_Count', 'Sum'),
      metric('latency_metric', 'TargetResponseTime', 'Average')
    ];
  },

  lambda: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/Lambda',
      dimensions: [{ Name: 'FunctionName', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('invocations', 'Invocations', 'Sum'),
      metric('duration', 'Duration', 'Average'),
      metric('errors', 'Errors', 'Sum'),
      metric('throttles', 'Throttles', 'Sum'),
      metric('durationP50', 'Duration', 'p50'),
      metric('durationP95', 'Duration', 'p95'),
      metric('durationP99', 'Duration', 'p99')
    ];
  },

  ecs: ({ primaryResourceIdentifier, secondaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/ECS',
      dimensions: [
        { Name: 'ClusterName', Value: primaryResourceIdentifier },
        { Name: 'ServiceName', Value: secondaryResourceIdentifier! }
      ],
      period
    });
    return [
      metric('cpuUtilization', 'CPUUtilization', 'Average'),
      metric('memoryUtilization', 'MemoryUtilization', 'Average')
    ];
  },

  rds: ({ primaryResourceIdentifier, period }) => {
    // Or DBClusterIdentifier for Aurora.
    const metric = metricsOf({
      namespace: 'AWS/RDS',
      dimensions: [{ Name: 'DBInstanceIdentifier', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('cpuUtilization', 'CPUUtilization', 'Average'),
      metric('freeableMemory', 'FreeableMemory', 'Average'),
      metric('databaseConnections', 'DatabaseConnections', 'Average'),
      // Used storage is calculated from free storage later.
      metric('storageUsed', 'FreeStorageSpace', 'Average')
    ];
  },

  cognito: ({ primaryResourceIdentifier, secondaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/Cognito',
      dimensions: [
        { Name: 'UserPool', Value: primaryResourceIdentifier },
        { Name: 'UserPoolClient', Value: secondaryResourceIdentifier! }
      ],
      period
    });
    return [metric('signUpSuccesses', 'SignUpSuccesses', 'Sum'), metric('signInSuccesses', 'SignInSuccesses', 'Sum')];
  },

  // The two S3 metrics are reported under different storage types, so each carries its own dimensions.
  s3: ({ primaryResourceIdentifier, period }) => {
    const inStorageType = (storageType: string) =>
      metricsOf({
        namespace: 'AWS/S3',
        dimensions: [
          { Name: 'BucketName', Value: primaryResourceIdentifier },
          { Name: 'StorageType', Value: storageType }
        ],
        period
      });
    return [
      inStorageType('StandardStorage')('bucketSizeBytes', 'BucketSizeBytes', 'Average'),
      inStorageType('AllStorageTypes')('numberOfObjects', 'NumberOfObjects', 'Average')
    ];
  },

  dynamodb: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/DynamoDB',
      dimensions: [{ Name: 'TableName', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('consumedReadCapacityUnits', 'ConsumedReadCapacityUnits', 'Sum', true),
      metric('consumedWriteCapacityUnits', 'ConsumedWriteCapacityUnits', 'Sum', true)
    ];
  },

  redis: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/ElastiCache',
      dimensions: [{ Name: 'CacheClusterId', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('cpuUtilization', 'CPUUtilization', 'Average'),
      metric('memoryUsage', 'BytesUsedForCache', 'Average'),
      metric('cacheHits', 'CacheHits', 'Sum'),
      metric('cacheMisses', 'CacheMisses', 'Sum'),
      metric('evictions', 'Evictions', 'Sum'),
      metric('networkRxBytes', 'NetworkBytesIn', 'Average'),
      metric('networkTxBytes', 'NetworkBytesOut', 'Average'),
      metric('currConnections', 'CurrConnections', 'Average')
    ];
  },

  sqs: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/SQS',
      dimensions: [{ Name: 'QueueName', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('messagesWaiting', 'ApproximateNumberOfMessagesVisible', 'Maximum'),
      metric('oldestMessageAge', 'ApproximateAgeOfOldestMessage', 'Maximum'),
      metric('messagesSent', 'NumberOfMessagesSent', 'Sum'),
      metric('messagesDeleted', 'NumberOfMessagesDeleted', 'Sum')
    ];
  },

  sns: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/SNS',
      dimensions: [{ Name: 'TopicName', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('messagesPublished', 'NumberOfMessagesPublished', 'Sum'),
      metric('notificationsDelivered', 'NumberOfNotificationsDelivered', 'Sum'),
      metric('notificationsFailed', 'NumberOfNotificationsFailed', 'Sum')
    ];
  },

  stepfunctions: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/States',
      dimensions: [{ Name: 'StateMachineArn', Value: primaryResourceIdentifier }],
      period
    });
    return [
      metric('executionsStarted', 'ExecutionsStarted', 'Sum'),
      metric('executionsFailed', 'ExecutionsFailed', 'Sum'),
      metric('executionsTimedOut', 'ExecutionsTimedOut', 'Sum'),
      metric('executionTime', 'ExecutionTime', 'Average')
    ];
  },

  cloudfront: ({ primaryResourceIdentifier, period }) => {
    const metric = metricsOf({
      namespace: 'AWS/CloudFront',
      dimensions: [
        { Name: 'DistributionId', Value: primaryResourceIdentifier },
        { Name: 'Region', Value: 'Global' }
      ],
      period
    });
    return [
      metric('requests', 'Requests', 'Sum', true),
      metric('bytes_downloaded', 'BytesDownloaded', 'Sum', true),
      metric('bytes_uploaded', 'BytesUploaded', 'Sum', true),
      metric('total_error_rate', 'TotalErrorRate', 'Average', true),
      metric('error_rate_4xx', '4xxErrorRate', 'Average', true),
      metric('error_rate_5xx', '5xxErrorRate', 'Average', true)
    ];
  }
};

/** The queries one chart sends, in the order that chart reads them back. */
export const buildMetricQueries = ({
  metricResourceType,
  ...input
}: { metricResourceType: MetricResourceType } & MetricQueryInput) =>
  metricQueriesByResourceType[metricResourceType](input);
