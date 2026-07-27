import { globalStateManager } from '@application-services/global-state-manager';
import CloudwatchAlarm from '@cloudform/cloudWatch/alarm';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getAlarmDescription } from '@shared/naming/utils';
import { isAuroraCluster } from '../../../../databases/utils';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import { getDimensionsForInstance } from '../utils';

export const getDatabaseFreeStorageAlarm = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  if (isAuroraCluster({ resource })) {
    throw stpErrors.e58({ alarmName: alarm.name, stpResourceName: resource.name });
  }
  return getDatabaseFreeStorageAlarmForRegularRds({ alarm, resource });
};

const getDatabaseFreeStorageAlarmForRegularRds = ({
  alarm,
  resource
}: {
  alarm: AlarmDefinition;
  resource: StpRelationalDatabase;
}) => {
  const trigger = alarm.trigger as RelationalDatabaseFreeStorageTrigger;

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
        metricName: 'FreeStorageSpace',
        metricNamespace: 'AWS/RDS',
        statFunction,
        returnData: true
      })
    ]
  });
};
