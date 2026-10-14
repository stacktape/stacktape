import { markTiming, startTiming } from '@utils/timings';
import { runUsingCli } from './cli';

// Bun reports `writableLength` 0 for a pipe while writes are still queued, and `process.exit` discards them. An MCP
// server or CI reading `--agent` output would then lose the final result record whenever it reads slower than the
// CLI writes. Ending the stream resolves once everything is written. Terminal writes are synchronous, and the exit
// handler still writes the cursor reset there.
const drainStream = async (stream: NodeJS.WriteStream) => {
  if (stream.isTTY || stream.writableEnded) {
    return;
  }

  await new Promise<void>((resolve) => {
    stream.once('error', () => resolve());
    stream.end(resolve);
    // A reader that stops reading without closing the pipe must not keep the CLI alive.
    setTimeout(resolve, 10_000).unref();
  });
};

const finishProcess = async () => {
  const endDrain = startTiming('shutdown:drain-output');
  await Promise.all([drainStream(process.stdout), drainStream(process.stderr)]);
  endDrain();
  process.exit(process.exitCode ?? 0);
};

runUsingCli()
  .catch((err) => {
    if (process.env.STP_PRINT_UNHANDLED_ERROR === '1') {
      process.stderr.write(
        `[CLI UNHANDLED ERROR] ${err instanceof Error ? err.stack || err.message : JSON.stringify(err)}\n`
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    markTiming('shutdown:start');
    if (process.env.STP_DEBUG_ACTIVE_HANDLES === '1') {
      const activeResources = (process as any).getActiveResourcesInfo?.() || [];
      const activeHandles = ((process as any)._getActiveHandles?.() || []).map(
        (handle: any) => handle?.constructor?.name || 'Unknown'
      );
      const activeRequests = ((process as any)._getActiveRequests?.() || []).map(
        (request: any) => request?.constructor?.name || 'Unknown'
      );
      process.stderr.write(`[CLI EXIT DEBUG] active resources: ${JSON.stringify(activeResources)}\n`);
      process.stderr.write(`[CLI EXIT DEBUG] active handles: ${JSON.stringify(activeHandles)}\n`);
      process.stderr.write(`[CLI EXIT DEBUG] active requests: ${JSON.stringify(activeRequests)}\n`);
    }

    await finishProcess();
  });
