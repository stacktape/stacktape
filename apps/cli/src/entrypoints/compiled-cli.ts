import { runUsingCli } from './cli';
import { drainOutputStream } from './drain-output';

const finishProcess = async () => {
  await Promise.all([drainOutputStream(process.stdout), drainOutputStream(process.stderr)]);
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
