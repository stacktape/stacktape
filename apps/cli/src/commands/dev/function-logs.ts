import { isAbsolute, relative } from 'node:path';
import stripAnsi from 'strip-ansi';

/**
 * How a dev session shows the CloudWatch logs of its deployed functions.
 *
 * Between the end of one session and the start of the next one's log readers (a restart), invocations still run: a
 * schedule, a queue, a retry. Their logs were never shown, so an invocation that failed during a restart left no trace
 * in the dev log. The next session of the stage reads from where the previous one ended, at most `MAX_CATCH_UP_MS`
 * back, and marks those entries.
 *
 * CloudWatch receives a line seconds after it was written, and a session reads it at its next poll, so the lines of the
 * last seconds before a stop, and the START line of an invocation that was still running, were never shown by either
 * session. The ending session records the events it showed in its last `CATCH_UP_OVERLAP_MS`; the next one reads from
 * that far before the end and skips them.
 */
export const MAX_CATCH_UP_MS = 5 * 60_000;
export const CATCH_UP_OVERLAP_MS = 60_000;

export const BEFORE_READY_LABEL = '(before this session was ready)';

/**
 * The text of a line the session caught up on. An invocation that timed out after the previous session ended and before
 * this one read logs ran while no session was there to answer it: a function that reaches local resources through the
 * dev box waits for them until it times out, and its line says only `Status: timeout`.
 */
export const labelCatchUpLine = ({
  message,
  timestamp,
  previousSessionEnd
}: {
  message: string;
  timestamp?: number;
  previousSessionEnd?: number;
}) => {
  const label = `${BEFORE_READY_LABEL} ${message}`;
  const ranWithoutSession =
    previousSessionEnd !== undefined && timestamp !== undefined && timestamp > previousSessionEnd;
  return ranWithoutSession && /\bStatus: timeout\b/.test(stripAnsi(message))
    ? `${label} No dev session was running for this stage then, so the local resources it reaches through the dev box did not answer.`
    : label;
};

/** What the previous session of a stage left for the next one. */
export type PreviousSessionEnd = {
  end: number;
  /**
   * Where the recorded overlap starts: `CATCH_UP_OVERLAP_MS` before the end, or later when the session read no further
   * back. Events before it belong to an earlier session or to no session.
   */
  overlapStart?: number;
  /** The events it showed in its last `CATCH_UP_OVERLAP_MS`, by log group; absent when an older CLI wrote the file. */
  shownEvents?: Record<string, Array<[eventId: string, timestamp: number]>>;
};

export const serializeSessionEnd = (sessionEnd: PreviousSessionEnd) => JSON.stringify(sessionEnd);

/** The session end file: JSON, or the bare end time an older CLI wrote. */
export const parseSessionEnd = (content: string): PreviousSessionEnd | undefined => {
  const trimmed = content.trim();
  if (/^\d+$/.test(trimmed)) return { end: Number(trimmed) };
  try {
    const parsed = JSON.parse(trimmed) as PreviousSessionEnd;
    return typeof parsed?.end === 'number' && parsed.end > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Where a function's log reader starts: before the previous session's end by the overlap whose shown events it
 * recorded, within the cap, or `now` without a previous session.
 */
export const getLogReadStart = ({
  previousSessionEnd,
  now
}: {
  previousSessionEnd?: PreviousSessionEnd;
  now: number;
}) => {
  if (!previousSessionEnd || previousSessionEnd.end >= now) return now;
  const { end, overlapStart, shownEvents } = previousSessionEnd;
  const start = shownEvents ? Math.min(end, overlapStart ?? end - CATCH_UP_OVERLAP_MS) : end;
  return Math.max(start, now - MAX_CATCH_UP_MS);
};

/**
 * Lambda runs a function's package from `/var/task`, so an error frame names `/var/task/process_receipt.py` for the
 * project's `workers/process_receipt.py`. A path whose end matches exactly one of the function's source files is shown
 * relative to the project; others (installed dependencies, a bundle) stay as they are.
 */
export const mapLambdaTaskPaths = ({
  message,
  sourceFiles,
  workingDirectory
}: {
  message: string;
  sourceFiles: string[];
  workingDirectory: string;
}) => {
  if (!message.includes('/var/task/') || !sourceFiles.length) return message;
  const projectFiles = sourceFiles.map((file) => ({
    file,
    path: (isAbsolute(file) ? relative(workingDirectory, file) : file).replaceAll('\\', '/')
  }));
  return message.replace(/\/var\/task\/([^\s"'():,]+)/g, (taskPath, packagePath: string) => {
    const matches = projectFiles.filter(({ path }) => path === packagePath || path.endsWith(`/${packagePath}`));
    return matches.length === 1 ? matches[0]!.path : taskPath;
  });
};
