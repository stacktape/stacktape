import { capitalizeFirstLetter } from '@shared/utils/misc';

const getCustomMetricFromAlarm = (alarm: AlarmDefinition): string => {
  return (alarm.trigger as any).properties?.metric;
};

export const getCauseString = ({ alarmDetail }: { alarmDetail: AlarmNotificationEventRuleInput }) => {
  const customMetric = getCustomMetricFromAlarm(alarmDetail.alarmConfig);
  const monitoredMetric = customMetric
    ? `${alarmDetail.statFunction} ${customMetric}`
    : capitalizeFirstLetter(
        `${alarmDetail.statFunction ? `${alarmDetail.statFunction} ` : ''}${alarmDetail.alarmConfig.trigger.type.replace(
          /-/g,
          ' '
        )}`
      );
  const comparisonSymbol =
    alarmDetail.alarmConfig.trigger.type === 'sqs-queue-not-empty'
      ? undefined
      : alarmDetail.comparisonOperator === 'GreaterThanThreshold'
        ? '>'
        : alarmDetail.comparisonOperator === 'GreaterThanOrEqualToThreshold'
          ? '≥'
          : alarmDetail.comparisonOperator === 'LessThanThreshold'
            ? '<'
            : alarmDetail.comparisonOperator === 'LessThanOrEqualToThreshold'
              ? '≤'
              : undefined;

  const unit = alarmDetail.measuringUnit || '';
  const threshold = getThresholdValue({ alarm: alarmDetail.alarmConfig });
  return `${monitoredMetric}${comparisonSymbol ? ` ${comparisonSymbol} ${threshold}${unit}` : ''} `;
};

export const getThresholdValue = ({ alarm }: { alarm: AlarmDefinition }) => {
  switch (alarm.trigger.type) {
    case 'lambda-error-rate':
    case 'database-cpu-utilization':
    case 'http-api-gateway-error-rate':
    case 'application-load-balancer-error-rate':
    case 'application-load-balancer-unhealthy-targets':
      return alarm.trigger.properties.thresholdPercent;
    case 'database-connection-count':
    case 'sqs-queue-received-messages-count':
      return alarm.trigger.properties.thresholdCount;
    case 'database-free-storage':
    case 'database-free-memory':
      return alarm.trigger.properties.thresholdMB;
    case 'database-read-latency':
    case 'database-write-latency':
      return alarm.trigger.properties.thresholdSeconds;
    case 'lambda-duration':
    case 'http-api-gateway-latency':
      return alarm.trigger.properties.thresholdMilliseconds;
    case 'sqs-queue-not-empty':
      return '';
    case 'application-load-balancer-custom':
      return alarm.trigger.properties.threshold;
    default:
      return null;
  }
};
