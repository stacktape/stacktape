import { runUsingCli } from './index';

const drainStream = async (stream: NodeJS.WriteStream) => {
  if (stream.writableLength === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    stream.once('drain', resolve);
    setTimeout(resolve, 300);
  });
};

const finishProcess = async () => {
  await Promise.all([drainStream(process.stdout), drainStream(process.stderr)]);
  process.exit(process.exitCode ?? 0);
};

runUsingCli()
  .catch(() => {
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
