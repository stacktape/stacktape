export const normalizePathForLink = (path: string) => {
  if (path === '*') {
    return '/*';
  }
  return path;
};

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** The UTC offset of `date` in this machine's time zone, written as ISO 8601 does: `+02:00`, `-05:30`. */
const getUtcOffset = (date: Date) => {
  const minutes = -date.getTimezoneOffset();
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
};

const getLocalDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * The time in this machine's time zone as ISO 8601 with milliseconds and the UTC offset, `2026-10-24T18:12:58.123+02:00`:
 * for log lines and machine output, which a reader in another zone or a program must read the same way.
 */
export const formatIsoLocalTime = (date: Date): string =>
  `${getLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(
    date.getMilliseconds(),
    3
  )}${getUtcOffset(date)}`;

/**
 * A short time of day with its zone for messages, `18:14:43 UTC+02:00`, and the date in front when it is not the day of
 * `now`: `2026-10-23 18:14:43 UTC+02:00`.
 */
export const formatTimeWithZone = (date: Date, now = new Date()): string => {
  const offset = getUtcOffset(date);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} UTC${
    offset === '+00:00' ? '' : offset
  }`;
  return getLocalDate(date) === getLocalDate(now) ? time : `${getLocalDate(date)} ${time}`;
};
