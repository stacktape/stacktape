import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { Ref } from '@cloudform/functions';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';

export const getHttpApiGatewayLatencyAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpHttpApiGateway;
}) => {
  const trigger = alarm.trigger as HttpApiGatewayLatencyTrigger;

  const dimensions: Dimension[] = [{ Name: 'ApiId', Value: Ref(cfLogicalNames.httpApi(resource.name)) }];
  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdMilliseconds;
  const statFunction = getStatFunction({ alarm });

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
      getMetricStatDataQuery({
        alarm,
        dimensions,
        metricNamespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        statFunction,
        returnData: true
      })
    ]
  });
};
