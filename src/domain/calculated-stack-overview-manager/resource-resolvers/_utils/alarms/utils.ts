import type { Dimension, MetricDataQuery } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import { Ref } from '@cloudform/functions';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { snakeCase } from 'change-case';
import { isAuroraCluster } from '../../databases/utils';

export const getComparisonOperator = ({ alarm }: { alarm: AlarmDefinition }) => {
  if (alarm.trigger.type === 'sqs-queue-not-empty') {
    return defaultComparisonOperators[alarm.trigger.type];
  }
  return (
    (alarm.trigger.properties as TriggerWithCustomComparison).comparisonOperator ||
    defaultComparisonOperators[alarm.trigger.type]
  );
};

export const getStatFunction = ({ alarm }: { alarm: AlarmDefinition }) => {
  if (alarm.trigger.type === 'sqs-queue-not-empty') {
    return defaultStatFunctions[alarm.trigger.type];
  }
  return statFunctionMapping[
    (alarm.trigger.properties as TriggerWithCustomStatFunction).statistic || defaultStatFunctions[alarm.trigger.type]
  ];
};

const defaultComparisonOperators: { [_alarmType in AlarmDefinition['trigger']['type']]: ComparisonOperator } = {
  'lambda-error-rate': 'GreaterThanThreshold',
  'lambda-duration': 'GreaterThanThreshold',
  'database-connection-count': 'GreaterThanThreshold',
  'database-cpu-utilization': 'GreaterThanThreshold',
  'database-free-storage': 'LessThanThreshold',
  'database-read-latency': 'GreaterThanThreshold',
  'database-write-latency': 'GreaterThanThreshold',
  'database-free-memory': 'LessThanThreshold',
  'http-api-gateway-error-rate': 'GreaterThanThreshold',
  'http-api-gateway-latency': 'GreaterThanThreshold',
  'application-load-balancer-error-rate': 'GreaterThanThreshold',
  'application-load-balancer-unhealthy-targets': 'GreaterThanThreshold',
  'sqs-queue-received-messages-count': 'GreaterThanThreshold',
  'sqs-queue-not-empty': 'GreaterThanThreshold',
  'application-load-balancer-custom': 'GreaterThanThreshold'
};

const defaultStatFunctions: { [_alarmType in AlarmDefinition['trigger']['type']]?: StatisticFunction } = {
  'lambda-duration': 'avg',
  'database-connection-count': 'avg',
  'database-cpu-utilization': 'avg',
  'database-free-storage': 'min',
  'database-read-latency': 'avg',
  'database-write-latency': 'avg',
  'database-free-memory': 'avg',
  'http-api-gateway-latency': 'avg',
  'sqs-queue-received-messages-count': 'avg',
  'application-load-balancer-custom': 'avg'
};

export const measuringUnits: { [_alarmType in AlarmDefinition['trigger']['type']]: string } = {
  'lambda-error-rate': '%',
  'lambda-duration': 'ms',
  'database-connection-count': '',
  'database-cpu-utilization': '%',
  'database-free-storage': 'MB',
  'database-read-latency': 's',
  'database-write-latency': 's',
  'database-free-memory': 'MB',
  'http-api-gateway-error-rate': '%',
  'http-api-gateway-latency': 'ms',
  'application-load-balancer-error-rate': '%',
  'application-load-balancer-unhealthy-targets': '%',
  'sqs-queue-received-messages-count': '',
  'sqs-queue-not-empty': '',
  'application-load-balancer-custom': ''
};

const statFunctionMapping: { [_func in StatisticFunction]: string } = {
  avg: 'Average',
  max: 'Maximum',
  min: 'Minimum',
  sum: 'Sum',
  p90: 'p90',
  p95: 'p95',
  p99: 'p99'
};

export const getAffectedResourceInfo = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpResource;
}): AlarmAffectedResourceInfo => {
  switch (alarm.trigger.type) {
    case 'lambda-duration':
    case 'lambda-error-rate': {
      return {
        displayName: resource.nameChain.join('.'),
        link: cfEvaluatedLinks.lambda({
          awsLambdaName: (resource as StpLambdaFunction).resourceName,
          tab: 'monitoring',
          alias: (resource as StpLambdaFunction).aliasLogicalName && awsResourceNames.lambdaStpAlias()
        }) as unknown as string
      };
    }
    case 'database-connection-count':
    case 'database-cpu-utilization':
    case 'database-free-storage':
    case 'database-read-latency':
    case 'database-write-latency':
    case 'database-free-memory': {
      const isCluster = isAuroraCluster({ resource: resource as StpRelationalDatabase });
      const dbIdentifier = isCluster
        ? Ref(cfLogicalNames.auroraDbCluster(resource.name))
        : Ref(cfLogicalNames.dbInstance(resource.name));
      return {
        displayName: resource.nameChain.join('.'),
        link: cfEvaluatedLinks.relationalDatabase(dbIdentifier, isCluster, 'monitoring') as unknown as string
      };
    }
    case 'http-api-gateway-error-rate':
    case 'http-api-gateway-latency': {
      return {
        displayName: resource.nameChain.join('.'),
        link: cfEvaluatedLinks.httpApiGateway({
          apiId: Ref(cfLogicalNames.httpApi(resource.name))
        }) as unknown as string
      };
    }
    case 'application-load-balancer-error-rate':
    case 'application-load-balancer-unhealthy-targets':
    case 'application-load-balancer-custom': {
      return {
        displayName: resource.nameChain.join('.'),
        link: consoleLinks.cloudwatchAlbDashboard(globalStateManager.region)
      };
    }
    case 'sqs-queue-received-messages-count':
    case 'sqs-queue-not-empty': {
      const queueAwsName = awsResourceNames.sqsQueue(
        resource.name,
        globalStateManager.targetStack?.stackName,
        (resource as StpSqsQueue).fifoEnabled
      );
      return {
        displayName: resource.nameChain.join('.'),
        link: consoleLinks.sqsQueue(
          globalStateManager.region,
          globalStateManager.targetAwsAccount?.awsAccountId,
          queueAwsName
        )
      };
    }
    default: {
      // @note this is to ensure that we handle all possible types, even when new types are added
      const _alarmTriggerCheck: never = alarm.trigger;
    }
  }
};

export const comparisonOperatorToSymbolMapping: { [_operator in ComparisonOperator]: string } = {
  GreaterThanThreshold: '>',
  GreaterThanOrEqualToThreshold: '>=',
  LessThanOrEqualToThreshold: '<=',
  LessThanThreshold: '<'
};

export const getMetricStatDataQuery = ({
  alarm,
  dimensions,
  metricName,
  metricNamespace,
  returnData,
  statFunction,
  index
}: {
  metricNamespace: string;
  metricName: string;
  dimensions: Dimension[];
  alarm: AlarmDefinition;
  returnData: boolean;
  statFunction: string;
  index?: number;
}): MetricDataQuery => {
  return {
    Id: snakeCase(`${metricName}${index !== undefined ? index : ''}`),
    MetricStat: {
      Metric: {
        Namespace: metricNamespace,
        MetricName: metricName,
        Dimensions: dimensions
      },
      Period: alarm.evaluation?.period || 60,
      Stat: statFunction
    },
    ReturnData: returnData,
    Label: `${[
      statFunction,
      ...alarm.trigger.type.split('-'),
      'over last',
      alarm.evaluation?.period || 60,
      'seconds'
    ].join(' ')}`
  };
};
