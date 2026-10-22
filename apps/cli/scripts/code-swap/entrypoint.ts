import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { trace } from './trace';

// Match the source-dev wrapper's process lifetime without including its per-command compilation in edit timing.
if (import.meta.main) {
  const recovery = process.argv.indexOf('--recoverOperation');
  if (recovery >= 0) {
    const invocationId = process.argv[recovery + 1];
    if (!invocationId || invocationId.startsWith('--')) throw new Error('--recoverOperation needs an invocation ID.');
    process.env.STP_CODE_SWAP_BENCH_RECOVER = invocationId;
    process.argv.splice(recovery, 2);
  }
  const supervisor = resolve(import.meta.dir, 'stacktape-supervisor');
  if (existsSync(supervisor)) process.env.STP_CODE_SWAP_BENCH_SUPERVISOR ??= supervisor;
  trace('entry');
  process.env.STP_DEV_MODE = 'true';
  import('../../src/entrypoints/cli')
    .then(({ runUsingCli }) => {
      trace('cliLoaded');
      return runUsingCli();
    })
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        const { codeSwapFinish } = await import('../../src/domain/code-swap/lifecycle-hooks');
        await codeSwapFinish();
      } catch (error) {
        console.error(error instanceof Error ? error.message : 'Could not release the code-swap lock.');
        process.exitCode = 1;
      }
      process.exit(process.exitCode ?? 0);
    });
}
