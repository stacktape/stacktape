import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { isAuroraCluster, isAuroraServerlessCluster } from '../../../../databases/utils';
import {
  comparisonOperatorToSymbolMapping,
  getComparisonOperator,
  getMetricStatDataQuery,
  getStatFunction
} from '../../utils';
import { getDimensionsForAuroraCluster, getDimensionsForAuroraInstance, getDimensionsForInstance } from '../utils';

export const getDatabaseCPUUtilizationAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  if (isAuroraServerlessCluster({ resource })) {
    return getDatabaseCPUUtilizationAlarmForAuroraServerless({ alarm, resource });
  }
  if (isAuroraCluster({ resource })) {
    return getDatabaseCPUUtilizationAlarmForAurora({ alarm, resource });
  }
  return getDatabaseCPUUtilizationAlarmForRegularRds({ alarm, resource });
};

const getDatabaseCPUUtilizationAlarmForAurora = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseCPUUtilizationTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdPercent;
  const statFunction = getStatFunction({ alarm });
  const dataQueriesForAuroraInstancies = (resource.engine as AuroraEngine).properties.instances.map((_, index) =>
    getMetricStatDataQuery({
      alarm,
      dimensions: getDimensionsForAuroraInstance({
        databaseResource: resource,
        instanceNumber: index
      }),
      metricName: 'CPUUtilization',
      metricNamespace: 'AWS/RDS',
      statFunction,
      returnData: false,
      index
    })
  );
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
    ComparisonOperator: 'GreaterThanThreshold',
    Threshold: 0,
    TreatMissingData: 'breaching',
    Metrics: [
      ...dataQueriesForAuroraInstancies,
      {
        Id: 'any_of_instancies',
        Expression: dataQueriesForAuroraInstancies
          .map(({ Id }) => `${Id} ${comparisonOperatorToSymbolMapping[comparisonOperator]} ${threshold}`)
          .join(' || '),
        Period: alarm.evaluation?.period || 60,
        Label: 'Any instance in cluster crosses CPU utilization threshold',
        ReturnData: true
      }
    ]
  });
};

const getDatabaseCPUUtilizationAlarmForAuroraServerless = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseCPUUtilizationTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdPercent;
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
    TreatMissingData: 'breaching',
    Metrics: [
      getMetricStatDataQuery({
        alarm,
        dimensions: getDimensionsForAuroraCluster({ databaseResource: resource }),
        metricName: 'CPUUtilization',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};

const getDatabaseCPUUtilizationAlarmForRegularRds = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseCPUUtilizationTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdPercent;
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
    TreatMissingData: 'breaching',
    Metrics: [
      getMetricStatDataQuery({
        alarm,
        dimensions: getDimensionsForInstance({ databaseResource: resource }),
        metricName: 'CPUUtilization',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};
