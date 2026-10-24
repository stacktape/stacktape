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

// The dogfood run edited a file within a second of `dev --agent` returning, and the edit never deployed. The old
// watcher also stopped watching while a rebuild ran, so edits made meanwhile were lost.
test('--watch sees an edit made right after the start and edits made during a rebuild, and reports config edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-source-watcher-'));
  const api = join(directory, 'api.ts');
  const shared = join(directory, 'shared.ts');
  const config = join(directory, 'stacktape.ts');
  for (const file of [api, shared, config]) await writeFile(file, '// 1\n');
  const changes: string[] = [];
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
      changes.push(workloads.join('+'));
      if (changes.length === 1) await new Promise<void>((resolve) => (releaseRebuild = resolve));
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
    await waitFor(() => changes.length === 1);
    // Edited while that rebuild runs: the change is handed on at once; the rebuilder queues it behind the running build.
    await writeFile(api, '// 3\n');
    await waitFor(() => changes.length === 2);
    releaseRebuild!();
    await watcher.settled();

    // Two workloads built from one file rebuild together.
    await writeFile(shared, '// 2\n');
    await waitFor(() => changes.length === 3);
    expect(changes).toEqual(['api', 'api', 'api+worker']);

    await writeFile(config, '// 2\n');
    await waitFor(() => configChanges === 1);
    await watcher.settled();
    expect(changes).toHaveLength(3);

    // A burst of writes, as an editor or a formatter makes, is handed on once, after its last write.
    await writeFile(api, '// 4\n');
    await new Promise((resolve) => setTimeout(resolve, 10));
    await writeFile(api, '// 5\n');
    await waitFor(() => changes.length === 4);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await watcher.settled();
    expect(changes).toHaveLength(4);
  } finally {
    await watcher.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('--watch starts when there is nothing to watch', async () => {
  const watcher = await startSourceWatcher({
    getSourceFiles: () => new Map(),
    onWorkloadChange: async () => {},
    onConfigChange: async () => {}
  });
  await watcher.close();
});
