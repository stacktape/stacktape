import { cfnResource } from '@stacktape/cloudformation/resource';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getAlarmDescription } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';
import { isAuroraCluster } from '../../../../databases/utils';
import { getComparisonOperator, getMetricStatDataQuery, getStatFunction } from '../../utils';
import { getDimensionsForInstance } from '../utils';
import type { RelationalDatabaseFreeStorageTrigger } from '@stacktape/config/alarms';

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
