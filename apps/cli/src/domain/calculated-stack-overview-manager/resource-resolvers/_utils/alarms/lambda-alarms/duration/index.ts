import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { Join, Ref } from '@cloudform/functions';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getAlarmDescription } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import type { LambdaDurationTrigger } from '@stacktape/config/alarms';

export const getLambdaDurationAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpLambdaFunction;
}) => {
  const trigger = alarm.trigger as LambdaDurationTrigger;

  const lambdaDimensions: Dimension[] = [
    { Name: 'FunctionName', Value: Ref(resource.cfLogicalName) },
    {
      Name: 'Resource',
      Value: resource.aliasLogicalName
        ? Join(':', [Ref(resource.cfLogicalName), awsResourceNames.lambdaStpAlias()])
        : Ref(resource.cfLogicalName)
    }
    // @todo Ideally during blue/green deployment you only want to monitor new version of alias (while traffic is being gradually shifted to it).
    // That gives opportunity to i.e rollback if new version error rate is too high.
    // ATM if we enable this, the problem would occur during hotswap: the lambda and the alias would be updated, but alarm would be still pointing to the old version.
    // To use this feature (targeting specific version of alias), we will probably have to implement hotSwap for alarm (at least lambda ones) or find some other solution.
    // ...(resource.deployment
    //   ? [
    //       {
    //         Name: 'ExecutedVersion',
    //         Value: GetAtt(cfLogicalNames.lambdaVersionPublisherCustomResource(resource.name), 'version')
    //       }
    //     ]
    //   : [])
  ];
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
        threshold,
        statFunction
      }),
    EvaluationPeriods: alarm.evaluation?.evaluationPeriods || 1,
    DatapointsToAlarm: alarm.evaluation?.breachedPeriods,
    ComparisonOperator: comparisonOperator,
    Threshold: threshold,
    TreatMissingData: 'notBreaching',
    Metrics: [
      getMetricStatDataQuery({
        alarm,
        dimensions: lambdaDimensions,
        metricNamespace: 'AWS/Lambda',
        metricName: 'Duration',
        statFunction,
        returnData: true
      })
    ]
  });
};
