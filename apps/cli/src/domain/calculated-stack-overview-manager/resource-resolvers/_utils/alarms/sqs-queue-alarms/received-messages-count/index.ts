import { cfnResource } from '@stacktape/cloudformation/resource';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getAlarmDescription } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import { getDimensionsForSqsQueue } from '../utils';
import type { SqsQueueReceivedMessagesCountTrigger } from '@stacktape/config/alarms';

export const getSqsQueueReceivedMessagesCountAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpSqsQueue;
}) => {
  const trigger = alarm.trigger as SqsQueueReceivedMessagesCountTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdCount;
  const statFunction = getStatFunction({ alarm });
  return cfnResource('AWS::CloudWatch::Alarm', {
    AlarmName: awsResourceNames.cloudwatchAlarm(calculatedStackOverviewManager.context.stackName, alarm.name),
    AlarmDescription:
      alarm.description ||
      getAlarmDescription({
        stackName: calculatedStackOverviewManager.context.stackName,
        stpResourceName: resource.name,
        triggerType: trigger.type,
        comparisonOperator,
        threshold,
        statFunction
      }),
    EvaluationPeriods: alarm.evaluation?.evaluationPeriods || 1,
    DatapointsToAlarm: alarm.evaluation?.breachedPeriods,
    ComparisonOperator: comparisonOperator,
    Threshold: threshold,
    TreatMissingData: 'breaching',
    Metrics: [
      getMetricStatDataQuery({
        alarm,
        dimensions: getDimensionsForSqsQueue({ queueResource: resource }),
        metricName: 'NumberOfMessagesReceived',
        metricNamespace: 'AWS/SQS',
        statFunction,
        returnData: true
      })
    ]
  });
};
