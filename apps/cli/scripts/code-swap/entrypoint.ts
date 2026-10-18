import { runUsingCli } from '../../src/entrypoints/cli';

// Match the source-dev wrapper's process lifetime without including its per-command compilation in edit timing.
if (import.meta.main) {
  process.env.STP_DEV_MODE = 'true';
  runUsingCli()
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(() => process.exit(process.exitCode ?? 0));
}
