/**
 * EventBridge rules accept `rate(1 minute)` and `rate(5 minutes)`, nothing else. EventBridge Scheduler, SAM and
 * several PaaS manifests are looser (`rate(5 minute)`), so an expression copied from a repository is normalized
 * before it lands in the configuration. Cron expressions and anything unrecognized pass through unchanged.
 */
export const normalizeScheduleExpression = (expression: string): string => {
  const match = expression.trim().match(/^rate\(\s*(\d+)\s*(minute|hour|day)s?\s*\)$/i);
  if (match === null) return expression;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  return `rate(${value} ${unit}${value === 1 ? '' : 's'})`;
};
