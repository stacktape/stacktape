import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { GetAtt } from '@cloudform/functions';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { getTargetsForContainerWorkload } from '../../../../multi-container-workloads/utils';
import { getComparisonOperator } from '../../utils';
import { getDimensionsForAlb } from '../utils';

export const getApplicationLoadBalancerUnhealthyTargetsAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpApplicationLoadBalancer;
}) => {
  const trigger = alarm.trigger as ApplicationLoadBalancerUnhealthyTargetsTrigger;
  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdPercent;

  // Get all container workloads that might be associated with this ALB
  const allWorkloads = configManager.allContainerWorkloads;
  const relevantTargets: Array<{
    workloadName: string;
    loadBalancerName: string;
    targetContainerPort?: number;
  }> = [];

  for (const workload of allWorkloads) {
    const targets = getTargetsForContainerWorkload({
      workloadName: workload.name,
      containers: workload.containers
    });
    for (const target of targets) {
      if (target.loadBalancerName === resource.name) {
        // If onlyIncludeTargets is specified, filter to only include specified workloads
        if (trigger.properties.onlyIncludeTargets && !trigger.properties.onlyIncludeTargets.includes(workload.name)) {
          continue;
        }
        relevantTargets.push({
          workloadName: workload.name,
          loadBalancerName: target.loadBalancerName,
          targetContainerPort: target.targetContainerPort
        });
      }
    }
  }

  if (relevantTargets.length === 0) {
    throw stpErrors.e127({ stpLoadBalancerName: resource.name });
  }

  // Get base ALB dimensions
  const albDimensions: Dimension[] = getDimensionsForAlb({ resource });

  // Create metrics for each target group
  const metrics = [];

  relevantTargets.forEach((target, index) => {
    const targetGroupDimensions: Dimension[] = [
      ...albDimensions,
      {
        Name: 'TargetGroup',
        Value: GetAtt(
          cfLogicalNames.targetGroup({
            stpResourceName: target.workloadName,
            loadBalancerName: target.loadBalancerName,
            targetContainerPort: target.targetContainerPort
          }),
          'TargetGroupFullName'
        )
      }
    ];

    metrics.push(
      {
        Id: `unhealthy_${index}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApplicationELB',
            MetricName: 'UnHealthyHostCount',
            Dimensions: targetGroupDimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Average'
        },
        ReturnData: false
      },
      {
        Id: `healthy_${index}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApplicationELB',
            MetricName: 'HealthyHostCount',
            Dimensions: targetGroupDimensions
          },
          Period: alarm.evaluation?.period || 60,
          Stat: 'Average'
        },
        ReturnData: false
      }
    );
  });

  // Create expression that takes the maximum percentage across all target groups
  // If any target group breaches the threshold, the alarm should trigger
  const expressions = relevantTargets.map(
    (_, index) =>
      `IF((unhealthy_${index} + healthy_${index}) > 0, (unhealthy_${index} / (unhealthy_${index} + healthy_${index})) * 100, 0)`
  );

  metrics.push({
    Id: alarm.trigger.type.replaceAll('-', '_'),
    Period: alarm.evaluation?.period || 60,
    Expression: `MAX([${expressions.join(', ')}])`,
    Label: 'Application load balancer unhealthy targets percentage (max across target groups)',
    ReturnData: true
  });

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
    Metrics: metrics
  });
};
