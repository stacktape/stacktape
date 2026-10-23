/**
 * Runs the offline deploy loop (`tests/ministack`) with the artifacts it needs: the development helper Lambdas, with
 * the Stacktape service Lambda packaged self-contained because MiniStack's local Node runtime does not provide the
 * AWS SDK. The ordinary development artifacts are rebuilt afterwards whatever the outcome, so no other lane or
 * `pnpm dev:cli` deployment runs with the bundled helper. Test files among the arguments replace the default
 * `tests/ministack` directory; the other arguments go to `bun test`.
 */
import { resolve } from 'node:path';

const cliRoot = resolve(import.meta.dir, '..', '..');

const run = (command: string[]) => {
  console.log(`$ ${command.join(' ')}`);
  return Bun.spawnSync(command, { cwd: cliRoot, stdout: 'inherit', stderr: 'inherit', env: process.env }).exitCode;
};

const prepared = run(['pnpm', 'exec', 'turbo', 'run', 'build:dev-artifacts', '--filter=@stacktape/cli']);
if (prepared !== 0) process.exit(prepared);
const bundled = run(['bun', 'scripts/package-helper-lambdas.ts', '--dev', '--bundle-aws-sdk']);
if (bundled !== 0) process.exit(bundled);
let outcome = 1;
try {
  // The package's bunfig preloads the fail-closed guard; the spec adds the emulator endpoint on top of it.
  const files = process.argv.slice(2).filter((argument) => argument.startsWith('tests/'));
  const options = process.argv.slice(2).filter((argument) => !argument.startsWith('tests/'));
  outcome = run(['bun', 'test', ...(files.length ? files : ['tests/ministack']), '--timeout', '600000', ...options]);
} finally {
  const restored = run(['bun', 'scripts/package-helper-lambdas.ts', '--dev']);
  if (restored !== 0) {
    console.error('The ordinary helper artifacts were not restored; run: bun scripts/package-helper-lambdas.ts --dev');
    outcome ||= restored;
  }
}
process.exit(outcome);
