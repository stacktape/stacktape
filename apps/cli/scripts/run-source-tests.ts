import { Glob } from 'bun';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

export const discoverSourceTests = (cwd: string): string[] =>
  [...new Glob('src/**/*{.test,_test,.spec,_spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}').scanSync({ cwd, onlyFiles: true })]
    .filter((file) => !file.split('/').includes('node_modules'))
    .toSorted();

// Bun 1.4.1's in-process --isolate intermittently fails while loading the CLI graph on Linux (before tests
// register). Use real process isolation for both module mocks and runtime state. Do not retry or skip a file.
export const runSourceTestFiles = async ({
  cwd,
  files,
  timeoutMs = 120_000
}: {
  cwd: string;
  files: string[];
  timeoutMs?: number;
}): Promise<string[]> => {
  if (files.length === 0) throw new Error('No CLI source test files found.');
  const failed: string[] = [];
  let next = 0;
  // Bound CPU and memory even when Turbo is testing other packages at the same time.
  await Promise.all(
    Array.from({ length: Math.min(2, files.length) }, async () => {
      while (next < files.length) {
        const file = files[next++];
        const result = await execa(process.execPath, ['test', '--no-orphans', `./${file}`], {
          cwd,
          stdin: 'ignore',
          all: true,
          reject: false,
          timeout: timeoutMs,
          forceKillAfterDelay: 1000
        });
        // Wait for complete output and print each file together, including import errors and timeouts.
        console.info(`\n${file}\n${result.all ?? ''}`);
        if (result.failed) {
          failed.push(file);
          console.error(result.shortMessage);
        }
      }
    })
  );
  return failed;
};

const main = async () => {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  try {
    const files = discoverSourceTests(cwd);
    const failed = await runSourceTestFiles({ cwd, files });
    console.info(`CLI source tests: ${files.length} files, ${failed.length} failed (two process-isolated workers).`);
    if (failed.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
};

if (import.meta.main) void main();
