import { cfnResource } from '@stacktape/cloudformation/resource';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getAlarmDescription } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';
import { getComparisonOperator, getStatFunction } from '../../utils';
import { getDimensionsForSqsQueue } from '../utils';
import type { SqsQueueNotEmptyTrigger } from '@stacktape/config/alarms';

export const getSqsQueueNotEmptyAlarm = ({ alarm, resource }: { alarm: AlarmDefinition; resource: StpSqsQueue }) => {
  const trigger = alarm.trigger as SqsQueueNotEmptyTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = 0;
  const statFunction = getStatFunction({ alarm });
  const dimensions = getDimensionsForSqsQueue({ queueResource: resource });
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
    // TreatMissingData: 'breaching',
    Metrics: [
      {
        Id: 'received',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/SQS',
            MetricName: 'NumberOfMessagesReceived',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      {
        Id: 'visible',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/SQS',
            MetricName: 'ApproximateNumberOfMessagesVisible',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      {
        Id: 'not_visible',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/SQS',
            MetricName: 'ApproximateNumberOfMessagesNotVisible',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      // {
      //   Id: 'delayed',
      //   MetricStat: {
      //     Metric: {
      //       Namespace: 'AWS/SQS',
      //       MetricName: 'NumberOfMessagesNotDelayed',
      //       Dimensions: dimensions
      //     },
      //     Period: alarm.evaluation?.period || 60,
      //     Stat: 'Sum'
      //   },
      //   ReturnData: false
      // },
      // {
      //   Id: 'deleted',
      //   MetricStat: {
      //     Metric: {
      //       Namespace: 'AWS/SQS',
      //       MetricName: 'NumberOfMessagesNotDeleted',
      //       Dimensions: dimensions
      //     },
      //     Period: alarm.evaluation?.period || 60,
      //     Stat: 'Sum'
      //   },
      //   ReturnData: false
      // },
      {
        Id: 'sent',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/SQS',
            MetricName: 'NumberOfMessagesSent',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      {
        Id: alarm.trigger.type.replaceAll('-', '_'),
        Period: alarm.evaluation?.period || 60,
        Expression: 'received + visible + not_visible + sent',
        Label: 'Messages in the queue (received + visible + not_visible + sent)',
        ReturnData: true
      }
    ]
  });
};
