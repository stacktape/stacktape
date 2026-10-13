import { startMiniStack } from '@stacktape/ministack/fixture';
import { runProcess, outputTail } from '../qualification/process';

const main = async () => {
  // One emulator for the lane. The shared fixture allocates each scenario's account.
  const ministack = await startMiniStack({ label: 'cli-operations' });
  try {
    const result = await runProcess({
      command: process.execPath,
      args: process.argv.includes('--db')
        ? ['scripts/operations/queries-docker.ts']
        : ['test', 'scripts/operations', ...process.argv.slice(2)],
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        J9_MINISTACK_ENDPOINT: ministack.endpoint,
        J9_MINISTACK_ACCOUNTS: JSON.stringify(Array.from({ length: 128 }, () => ministack.account())),
        J9_QUERY_SERVICES: process.env.J9_QUERY_SERVICES,
        J9_QUERY_FAIL_AFTER_START: process.env.J9_QUERY_FAIL_AFTER_START
      },
      timeoutMs: 480_000
    });
    console.info(outputTail(result.stdout, 20_000));
    console.info(outputTail(result.stderr, 20_000));
    process.exitCode = result.exitCode ?? 1;
    if (result.timedOut || result.interruptedSignal) process.exitCode = 1;
  } finally {
    await ministack.stop();
    console.info(`Verified removal: ${ministack.containerName}`);
  }
};
if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
