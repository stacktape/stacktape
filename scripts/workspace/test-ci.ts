import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanes, type Lane } from './test-registry.ts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ciLanes = (root: string, registry: readonly Lane[] = lanes): readonly Lane[] => {
  const consolePresent = existsSync(resolve(root, 'apps/console/api/package.json'));
  const selected = registry.filter(
    (lane) => lane.tier === 'pr' && (!lane.requires.includes('console') || consolePresent)
  );
  for (const lane of selected)
    if (lane.requires.some((requirement) => requirement !== 'console'))
      throw new Error(`PR lane ${lane.id} requires ${lane.requires.join(', ')}. Move it to change/release.`);
  return selected;
};
const main = async () => {
  const started = performance.now();
  for (const lane of ciLanes(workspaceRoot)) {
    console.info(`\n${lane.id} [${lane.level} · pr]: ${lane.command.join(' ')}`);
    const laneStarted = performance.now();
    // Invoke pnpm's JS entrypoint on Windows too; no shell expansion or .cmd quoting.
    const command = process.env.npm_execpath;
    if (!command) throw new Error('Run this runner through pnpm test:ci.');
    // Lanes run sequentially so the measured tier bounds CPU and memory on CI runners.
    // eslint-disable-next-line no-await-in-loop
    const code = await new Promise<number>((resolveExit, reject) => {
      const child = spawn(process.env.npm_node_execpath || 'node', [command, ...lane.command.slice(1)], {
        cwd: workspaceRoot,
        stdio: 'inherit',
        windowsHide: true
      });
      const timer = setTimeout(() => child.kill('SIGTERM'), 120_000);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (status) => {
        clearTimeout(timer);
        resolveExit(status ?? 1);
      });
    });
    if (code) throw new Error(`${lane.id} failed (exit ${code}).`);
    console.info(`${lane.id}: ${((performance.now() - laneStarted) / 1000).toFixed(1)} s`);
  }
  console.info(`\nPR tier passed in ${((performance.now() - started) / 1000).toFixed(1)} s.`);
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
