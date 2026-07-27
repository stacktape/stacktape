import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getCustomAlarmDescription } from '@shared/naming/utils';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import { getDimensionsForAlb } from '../utils';

export const getApplicationLoadBalancerCustomAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpApplicationLoadBalancer;
}) => {
  const trigger = alarm.trigger as ApplicationLoadBalancerCustomTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.threshold;
  const statFunction = getStatFunction({ alarm });
  return new CloudwatchAlarm({
    AlarmName: awsResourceNames.cloudwatchAlarm(globalStateManager.targetStack.stackName, alarm.name),
    AlarmDescription:
      alarm.description ||
      getCustomAlarmDescription({
        stackName: globalStateManager.targetStack.stackName,
        stpResourceName: resource.name,
        metricName: trigger.properties.metric,
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
      getMetricStatDataQuery({
        alarm,
        dimensions: getDimensionsForAlb({ resource }),
        metricName: trigger.properties.metric,
        metricNamespace: 'AWS/ApplicationELB',
        statFunction,
        returnData: true
      })
    ]
  });
};
