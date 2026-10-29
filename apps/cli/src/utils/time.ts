import { tuiManager } from '@application-services/tui-manager';

const HTTP_TIME_SYNC_TIMEOUT_MS = 5000;
/** A measured offset is reused this long. Later calls measure again, because a local clock can drift or be stepped. */
const CLOCK_OFFSET_MAX_AGE_MS = 60_000;

const getTimeViaHttp = async (): Promise<Date> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIME_SYNC_TIMEOUT_MS);
  try {
    const response = await fetch('https://aws.amazon.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      return new Date(dateHeader);
    }
    throw new Error('No date header in response');
  } finally {
    clearTimeout(timeoutId);
  }
};

let clockOffset: { offsetMs: Promise<number>; startedAt: number } | undefined;
/** The last measured offset. While a newer measurement runs, callers use this one instead of waiting. */
let lastOffsetMs: number | undefined;

const measureClockOffsetMs = async (): Promise<number> => {
  try {
    const awsTime = await getTimeViaHttp();
    lastOffsetMs = awsTime.getTime() - Date.now();
    return lastOffsetMs;
  } catch (err) {
    tuiManager.debug(`Failed to sync time via HTTP: ${err.message}. Using local time.`);
    return 0;
  }
};

const currentClockOffset = (): number | Promise<number> => {
  if (!clockOffset || performance.now() - clockOffset.startedAt > CLOCK_OFFSET_MAX_AGE_MS) {
    clockOffset = { offsetMs: measureClockOffsetMs(), startedAt: performance.now() };
  }
  // A newer measurement in flight does not hold up callers: the previous one is at most a few minutes old.
  return lastOffsetMs ?? clockOffset.offsetMs;
};

/**
 * Starts measuring the difference between the local clock and AWS's, so a later {@link getAwsSynchronizedTime} does
 * not wait for it. Call it right before an operation that will need the AWS time.
 */
export const startAwsClockSync = () => {
  void currentClockOffset();
};

/**
 * The current time by AWS's clock (to the second), or the local time when AWS cannot be reached. Calls within a minute
 * share one measurement of the clock offset instead of sending one HTTP request each.
 */
export const getAwsSynchronizedTime = async (): Promise<Date> => {
  const offsetMs = await currentClockOffset();
  return new Date(Date.now() + offsetMs);
};

/** Forgets the measured clock offset. For tests. */
export const resetAwsClockSync = () => {
  clockOffset = undefined;
  lastOffsetMs = undefined;
};
