import { pascalCase } from 'change-case';

export const getStpNameForAlarm = ({
  nameChain,
  alarmTriggerType,
  alarmIndexOrGlobalAlarmName
}: {
  nameChain: string[];
  alarmTriggerType: string;
  alarmIndexOrGlobalAlarmName: number | string;
}) => `${pascalCase(alarmTriggerType)}For${pascalCase(nameChain.join('.'))}${alarmIndexOrGlobalAlarmName}`;
