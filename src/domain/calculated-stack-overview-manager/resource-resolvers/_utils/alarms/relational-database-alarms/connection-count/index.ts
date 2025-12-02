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

export const getDatabaseConnectionCountAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  if (isAuroraServerlessCluster({ resource })) {
    return getDatabaseConnectionCountAlarmForAuroraServerless({ alarm, resource });
  }
  if (isAuroraCluster({ resource })) {
    return getDatabaseConnectionCountAlarmForAurora({ alarm, resource });
  }
  return getDatabaseConnectionCountAlarmForRegularRds({ alarm, resource });
};

const getDatabaseConnectionCountAlarmForAurora = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseConnectionCountTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdCount;
  const statFunction = getStatFunction({ alarm });
  const dataQueriesForAuroraInstancies = (resource.engine as AuroraEngine).properties.instances.map((_, index) =>
    getMetricStatDataQuery({
      alarm,
      dimensions: getDimensionsForAuroraInstance({
        databaseResource: resource,
        instanceNumber: index
      }),
      metricName: 'DatabaseConnections',
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
        Label: 'Any instance in cluster crosses connection count threshold',
        ReturnData: true
      }
    ]
  });
};

const getDatabaseConnectionCountAlarmForAuroraServerless = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseConnectionCountTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdCount;
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
        metricName: 'DatabaseConnections',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};

const getDatabaseConnectionCountAlarmForRegularRds = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseConnectionCountTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdCount;
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
        metricName: 'DatabaseConnections',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};
