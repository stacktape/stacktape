/** Unix day-of-week numbers (0 or 7 is Sunday) as EventBridge numbers (1 is Sunday). */
const eventBridgeDayOfWeek = (field: string): string => field.replace(/\d+/g, (day) => String((Number(day) % 7) + 1));

/**
 * A five-field Unix cron (`0 3 * * *`, as Render, Railway and crontab write it) as an EventBridge `cron(...)`.
 *
 * EventBridge adds a year field, numbers weekdays from 1 for Sunday, and needs `?` in either the day-of-month or the
 * day-of-week field. An expression that restricts both cannot be represented and is left as it was.
 */
const unixCronToEventBridge = (expression: string): string | undefined => {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5 || !fields.every((field) => /^[\d*,/-]+$/.test(field))) return undefined;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields as [string, string, string, string, string];
  if (dayOfWeek === '*') return `cron(${minute} ${hour} ${dayOfMonth} ${month} ? *)`;
  if (dayOfMonth === '*') return `cron(${minute} ${hour} ? ${month} ${eventBridgeDayOfWeek(dayOfWeek)} *)`;
  return undefined;
};

/**
 * EventBridge rules accept `rate(1 minute)` and `rate(5 minutes)`, nothing else. EventBridge Scheduler, SAM and
 * several PaaS manifests are looser (`rate(5 minute)`), so an expression copied from a repository is normalized
 * before it lands in the configuration. Stacktape takes only `rate(...)` and `cron(...)`, so a Unix cron is
 * converted. Other cron expressions and anything unrecognized pass through unchanged.
 */
export const normalizeScheduleExpression = (expression: string): string => {
  const unixCron = unixCronToEventBridge(expression);
  if (unixCron !== undefined) return unixCron;
  const match = expression.trim().match(/^rate\(\s*(\d+)\s*(minute|hour|day)s?\s*\)$/i);
  if (match === null) return expression;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  return `rate(${value} ${unit}${value === 1 ? '' : 's'})`;
};
