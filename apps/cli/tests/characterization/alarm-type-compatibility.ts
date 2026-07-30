import type {
  AlarmDefinition as ConfigAlarmDefinition,
  AlarmTrigger as ConfigAlarmTrigger
} from '@stacktape/config/alarms';

type Assert<T extends true> = T;

export type AmbientAlarmDefinitionExtendsCanonical = Assert<
  AlarmDefinition extends ConfigAlarmDefinition ? true : false
>;
export type CanonicalAlarmDefinitionExtendsAmbient = Assert<
  ConfigAlarmDefinition extends AlarmDefinition ? true : false
>;
export type AmbientAlarmTriggerExtendsCanonical = Assert<AlarmTrigger extends ConfigAlarmTrigger ? true : false>;
export type CanonicalAlarmTriggerExtendsAmbient = Assert<ConfigAlarmTrigger extends AlarmTrigger ? true : false>;
