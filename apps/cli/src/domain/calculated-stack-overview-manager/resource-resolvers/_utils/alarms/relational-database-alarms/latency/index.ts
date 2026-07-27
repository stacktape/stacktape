import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { isAuroraCluster, isAuroraServerlessCluster } from '../../../../databases/utils';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import { getDimensionsForAuroraCluster, getDimensionsForAuroraRole, getDimensionsForInstance } from '../utils';

export const getDatabaseLatencyAlarm = ({
  alarm,
  latencyType,
  resource
}: {
  alarm: AlarmDefinition;
  latencyType: 'read' | 'write';
  resource: StpRelationalDatabase;
}) => {
  if (isAuroraServerlessCluster({ resource })) {
    return getDatabaseLatencyAlarmForAuroraServerless({ alarm, resource, latencyType });
  }
  if (isAuroraCluster({ resource })) {
    return getDatabaseLatencyAlarmForAurora({ alarm, resource, latencyType });
  }
  return getDatabaseLatencyAlarmForRegularRds({ alarm, resource, latencyType });
};

const getDatabaseLatencyAlarmForAurora = ({
  alarm,
  resource,
  latencyType
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
  latencyType: 'read' | 'write';
}) => {
  const trigger = alarm.trigger as RelationalDatabaseReadLatencyTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdSeconds;
  const statFunction = getStatFunction({ alarm });
  const role =
    (resource.engine as AuroraEngine).properties.instances.length > 1 && latencyType === 'read' ? 'READER' : 'WRITER';
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
        dimensions: getDimensionsForAuroraRole({ databaseResource: resource, role }),
        metricName: latencyType === 'read' ? 'ReadLatency' : 'WriteLatency',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};

const getDatabaseLatencyAlarmForAuroraServerless = ({
  alarm,
  resource,
  latencyType
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
  latencyType: 'read' | 'write';
}) => {
  const trigger = alarm.trigger as RelationalDatabaseReadLatencyTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdSeconds;
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
        dimensions: getDimensionsForAuroraCluster({ databaseResource: resource }),
        metricName: latencyType === 'read' ? 'ReadLatency' : 'WriteLatency',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};

const getDatabaseLatencyAlarmForRegularRds = ({
  alarm,
  resource,
  latencyType
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
  latencyType: 'read' | 'write';
}) => {
  const trigger = alarm.trigger as RelationalDatabaseReadLatencyTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdSeconds;
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
        dimensions: getDimensionsForInstance({ databaseResource: resource }),
        metricName: latencyType === 'read' ? 'ReadLatency' : 'WriteLatency',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};
