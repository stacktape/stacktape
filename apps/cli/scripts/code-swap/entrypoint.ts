import { trace } from './trace';

// Match the source-dev wrapper's process lifetime without including its per-command compilation in edit timing.
if (import.meta.main) {
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
    .finally(() => process.exit(process.exitCode ?? 0));
}
