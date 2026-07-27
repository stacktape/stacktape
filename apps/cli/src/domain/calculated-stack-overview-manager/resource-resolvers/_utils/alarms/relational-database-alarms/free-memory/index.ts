import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { isAuroraCluster, isAuroraServerlessCluster } from '../../../../databases/utils';
import {
  comparisonOperatorToSymbolMapping,
  getComparisonOperator,
  getMetricStatDataQuery,
  getStatFunction
} from '../../utils';
import { getDimensionsForAuroraInstance, getDimensionsForInstance } from '../utils';

export const getDatabaseFreeMemoryAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  if (isAuroraServerlessCluster({ resource })) {
    throw stpErrors.e59({ alarmName: alarm.name, stpResourceName: resource.name });
  }
  if (isAuroraCluster({ resource })) {
    return getDatabaseFreeMemoryAlarmForAurora({ alarm, resource });
  }
  return getDatabaseFreeMemoryAlarmForRegularRds({ alarm, resource });
};

const getDatabaseFreeMemoryAlarmForAurora = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseFreeMemoryTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdMB;
  const statFunction = getStatFunction({ alarm });
  const dataQueriesForAuroraInstancies = (resource.engine as AuroraEngine).properties.instances.map((_, index) =>
    getMetricStatDataQuery({
      alarm,
      dimensions: getDimensionsForAuroraInstance({
        databaseResource: resource,
        instanceNumber: index
      }),
      metricName: 'FreeableMemory',
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
          .map(({ Id }) => `${Id} ${comparisonOperatorToSymbolMapping[comparisonOperator]} ${threshold * 1024 * 1024}`)
          .join(' || '),
        Period: alarm.evaluation?.period || 60,
        Label: 'Any instance in cluster crosses Free memory threshold',
        ReturnData: true
      }
    ]
  });
};

const getDatabaseFreeMemoryAlarmForRegularRds = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseFreeMemoryTrigger;

  const comparisonOperator = getComparisonOperator({ alarm });
  const threshold = trigger.properties.thresholdMB;
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
    Threshold: threshold * 1024 * 1024,
    TreatMissingData: 'breaching',
    Metrics: [
      getMetricStatDataQuery({
        alarm,
        dimensions: getDimensionsForInstance({ databaseResource: resource }),
        metricName: 'FreeableMemory',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};
