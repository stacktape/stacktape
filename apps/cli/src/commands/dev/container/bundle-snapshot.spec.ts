import { afterAll, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotRunBundle } from './bundle-snapshot';

// r2rr bug hunt: a rebuilt JS container wrote its new bundle into the folder the running container mounted, so a
// previous build started again after a failed rebuild ran the failing bundle.

const root = mkdtempSync(join(tmpdir(), 'stacktape-bundle-snapshot-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

test('each run mounts its own copy of the bundle, and the copy of the run that still serves is kept', async () => {
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'chunks'), { recursive: true });
  writeFileSync(join(dist, 'index.js'), 'console.log("working build")');
  writeFileSync(join(dist, 'chunks', 'routes.js'), 'export const routes = ["/"]');
  symlinkSync('chunks/routes.js', join(dist, 'routes.js'));
  const working = await snapshotRunBundle({ distFolderPath: dist });

  // The next build writes the same folder before its run starts.
  writeFileSync(join(dist, 'index.js'), 'throw new Error("new build crashes")');
  const crashing = await snapshotRunBundle({ distFolderPath: dist, keep: working });
  expect(readFileSync(join(working, 'index.js'), 'utf8')).toBe('console.log("working build")');
  expect(readFileSync(join(crashing, 'index.js'), 'utf8')).toContain('new build crashes');
  expect(readlinkSync(join(working, 'routes.js'))).toBe('chunks/routes.js');

  // The working build was started again and serves; the next run's copy replaces the crashing one.
  const next = await snapshotRunBundle({ distFolderPath: dist, keep: working });
  expect(existsSync(crashing)).toBe(false);
  expect(existsSync(working)).toBe(true);
  expect(existsSync(next)).toBe(true);
});
