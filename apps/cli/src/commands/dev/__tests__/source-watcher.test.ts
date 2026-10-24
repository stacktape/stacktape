import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSourceWatcher } from '../source-watcher';

const waitFor = async (condition: () => boolean, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the watcher.');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// The dogfood run edited a file within a second of `dev --agent` returning, and the edit never deployed.
test('--watch sees an edit made right after the start and one made during a rebuild, and reports config edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-source-watcher-'));
  const api = join(directory, 'api.ts');
  const shared = join(directory, 'shared.ts');
  const config = join(directory, 'stacktape.ts');
  for (const file of [api, shared, config]) await writeFile(file, '// 1\n');
  const rebuilt: string[] = [];
  let configChanges = 0;
  let releaseRebuild: (() => void) | undefined;
  const sources = new Map([
    ['api', [api]],
    ['worker', [shared]]
  ]);
  const watcher = await startSourceWatcher({
    getSourceFiles: () => sources,
    configPath: config,
    onWorkloadChange: async ({ workloads }) => {
      rebuilt.push(workloads.join('+'));
      if (rebuilt.length === 1) await new Promise<void>((resolve) => (releaseRebuild = resolve));
      // The rebuild found that api imports the worker's file too: the next edit to it rebuilds both.
      sources.set('api', [api, shared]);
    },
    onConfigChange: async () => {
      configChanges++;
    }
  });
  try {
    // Edited immediately after the watcher reported ready.
    await writeFile(api, '// 2\n');
    await waitFor(() => rebuilt.length === 1);
    // Edited twice while that rebuild runs: one more rebuild follows, not zero and not two.
    await writeFile(api, '// 3\n');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await writeFile(api, '// 4\n');
    await new Promise((resolve) => setTimeout(resolve, 300));
    releaseRebuild!();
    await waitFor(() => rebuilt.length === 2);
    await watcher.settled();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(rebuilt).toEqual(['api', 'api']);

    // Two workloads built from one file rebuild together.
    await writeFile(shared, '// 2\n');
    await waitFor(() => rebuilt.length === 3);
    expect(rebuilt[2]).toBe('api+worker');

    await writeFile(config, '// 2\n');
    await waitFor(() => configChanges === 1);
    await watcher.settled();
    expect(rebuilt).toHaveLength(3);
  } finally {
    await watcher.close();
    await rm(directory, { recursive: true, force: true });
  }
});
