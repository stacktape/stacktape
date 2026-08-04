import type { Dimension } from '@stacktape/cloudformation/resources/aws-cloudwatch-alarm';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { join, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
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
    { Name: 'FunctionName', Value: ref(resource.cfLogicalName) },
    {
      Name: 'Resource',
      Value: resource.aliasLogicalName
        ? join(':', [ref(resource.cfLogicalName), awsResourceNames.lambdaStpAlias()])
        : ref(resource.cfLogicalName)
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
