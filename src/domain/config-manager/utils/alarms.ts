import { stpErrors } from '@errors';
import { getStpNameForAlarm } from '@shared/naming/utils';
import isEqual from 'lodash/isEqual';
import { configManager } from '../index';

export const resolveReferenceToAlarm = ({
  stpAlarmReference,
  referencedFromType,
  referencedFrom
}: {
  stpAlarmReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  const stpAlarmReferenceSplit = stpAlarmReference.split('.');
  const alarm = configManager.allAlarms.find(({ nameChain }) => isEqual(stpAlarmReferenceSplit, nameChain));

  if (!alarm) {
    throw stpErrors.e60({ alarmReference: stpAlarmReference, referencedFrom, referencedFromType });
  }

  return alarm;
};

export const isGlobalAlarmEligibleForStack = ({
  alarm,
  projectName,
  stage
}: {
  alarm: AlarmDefinition;
  projectName: string;
  stage: string;
}) => {
  return (
    (alarm.forServices.includes('*') || alarm.forServices.includes(projectName)) &&
    (alarm.forStages.includes('*') || alarm.forStages.includes(stage))
  );
};

export const isAlarmEligibleForResource = ({ alarm, resource }: { alarm: AlarmDefinition; resource: StpResource }) => {
  return (
    !((resource as StpAlarmEnabledResource).disabledGlobalAlarms || []).includes(alarm.name) &&
    resourceTypesForAlarmType[alarm.trigger.type].includes(resource.type as StpAlarmEnabledResource['type'])
  );
};

export const resourceTypesForAlarmType: {
  [_alarmType in AlarmTriggerType]: StpAlarmEnabledResource['type'][];
} = {
  'application-load-balancer-error-rate': ['application-load-balancer'],
  'application-load-balancer-unhealthy-targets': ['application-load-balancer'],
  'application-load-balancer-custom': ['application-load-balancer'],
  'database-connection-count': ['relational-database'],
  'database-cpu-utilization': ['relational-database'],
  'database-free-memory': ['relational-database'],
  'database-free-storage': ['relational-database'],
  'database-read-latency': ['relational-database'],
  'database-write-latency': ['relational-database'],
  'http-api-gateway-error-rate': ['http-api-gateway'],
  'http-api-gateway-latency': ['http-api-gateway'],
  'lambda-duration': ['function'],
  'lambda-error-rate': ['function'],
  'sqs-queue-received-messages-count': ['sqs-queue'],
  'sqs-queue-not-empty': ['sqs-queue']
};

export const getAlarmsToBeAppliedToResource = ({
  resource,
  globalAlarms
}: {
  resource: StpResource;
  globalAlarms: AlarmDefinition[];
}) => {
  return [
    ...globalAlarms.map(
      (alarm) =>
        ({
          ...alarm,
          nameChain: [...resource.nameChain, 'alarms', alarm.name],
          name: getStpNameForAlarm({
            nameChain: resource.nameChain,
            alarmTriggerType: alarm.trigger.type,
            alarmIndexOrGlobalAlarmName: alarm.name
          })
        }) as StpAlarm
    ),
    ...((resource as StpAlarmEnabledResource).alarms || []).map(
      (alarm, idx) =>
        ({
          ...alarm,
          nameChain: [...resource.nameChain, 'alarms', `${idx}`],
          name: getStpNameForAlarm({
            nameChain: resource.nameChain,
            alarmTriggerType: alarm.trigger.type,
            alarmIndexOrGlobalAlarmName: idx
          })
        }) as StpAlarm
    )
  ].filter((alarm) => isAlarmEligibleForResource({ alarm, resource }));
};
