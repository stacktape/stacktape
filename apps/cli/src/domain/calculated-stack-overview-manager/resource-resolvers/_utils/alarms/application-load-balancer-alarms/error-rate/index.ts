import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { getComparisonOperator } from '../../utils';
import { getDimensionsForAlb } from '../utils';

export const getApplicationLoadBalancerErrorRateAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpApplicationLoadBalancer;
}) => {
  const trigger = alarm.trigger as ApplicationLoadBalancerErrorRateTrigger;
  // just to validate existence of load balancer

  const dimensions: Dimension[] = getDimensionsForAlb({ resource });
  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdPercent;
  return new CloudwatchAlarm({
    AlarmName: awsResourceNames.cloudwatchAlarm(globalStateManager.targetStack.stackName, alarm.name),
    AlarmDescription:
      alarm.description ||
      getAlarmDescription({
        stackName: globalStateManager.targetStack.stackName,
        stpResourceName: resource.name,
        triggerType: trigger.type,
        comparisonOperator,
        threshold
      }),
    EvaluationPeriods: alarm.evaluation?.evaluationPeriods || 1,
    DatapointsToAlarm: alarm.evaluation?.breachedPeriods,
    ComparisonOperator: comparisonOperator,
    Threshold: threshold,
    TreatMissingData: 'notBreaching',
    Metrics: [
      {
        Id: 'error_4xx_count',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApplicationELB',
            MetricName: 'HTTPCode_Target_4XX_Count',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      {
        Id: 'error_5xx_count',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApplicationELB',
            MetricName: 'HTTPCode_Target_5XX_Count',
            Dimensions: dimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Sum'
        },
        ReturnData: false
      },
      {
        Id: 'all_count',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApplicationELB',
            MetricName: 'RequestCount',
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
        Expression: '( ( error_4xx_count + error_5xx_count ) / all_count ) * 100',
        Label: 'Application load balancer error(4xx/5xx) rate percentage',
        ReturnData: true
      }
    ]
  });
};
