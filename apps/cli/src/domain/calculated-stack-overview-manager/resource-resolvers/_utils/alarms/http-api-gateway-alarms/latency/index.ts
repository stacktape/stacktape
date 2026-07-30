import type { AlarmDefinition } from '@stacktape/config/alarms';
import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { Ref } from '@cloudform/functions';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getAlarmDescription } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import type { HttpApiGatewayLatencyTrigger } from '@stacktape/config/alarms';

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
