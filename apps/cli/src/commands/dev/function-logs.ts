import { isAbsolute, relative } from 'node:path';

/**
 * How a dev session shows the CloudWatch logs of its deployed functions.
 *
 * Between the end of one session and the start of the next one's log readers (a restart), invocations still run: a
 * schedule, a queue, a retry. Their logs were never shown, so an invocation that failed during a restart left no trace
 * in the dev log. The next session of the stage reads from where the previous one ended, at most `MAX_CATCH_UP_MS`
 * back, and marks those entries.
 */
export const MAX_CATCH_UP_MS = 5 * 60_000;

export const BEFORE_READY_LABEL = '(before this session was ready)';

/** Where a function's log reader starts: the previous session's end within the cap, or `now` without one. */
export const getLogReadStart = ({ previousSessionEnd, now }: { previousSessionEnd?: number; now: number }) =>
  previousSessionEnd && previousSessionEnd < now ? Math.max(previousSessionEnd, now - MAX_CATCH_UP_MS) : now;

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
