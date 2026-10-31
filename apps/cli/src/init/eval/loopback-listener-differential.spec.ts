/**
 * Loopback-only listeners against main (r2ba, #425 review). Init may leave out a listener whose every `.listen(` binds
 * a loopback address in a package nothing runs, and nothing else: each fixture produces exactly main's resources, or
 * main's minus the one resource that ran the left-out listener, with a gap naming it. `loopback-listener.main.json`
 * holds main's resources, recorded from origin/main 198d2f9ce with the same mission inputs.
 */

import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGreenfieldMission } from '../missions/greenfield';
import { LOOPBACK_LISTENER_FIXTURES } from './loopback-listener.fixtures';
import mainResources from './loopback-listener.main.json';

const recorded: Record<string, Record<string, string>> = mainResources;

const run = async (files: Record<string, string>) => {
  const parent = await mkdtemp(join(tmpdir(), 'stacktape-loopback-listener-'));
  // A fixed directory name: the repository name is the fallback name of a root service.
  const root = join(parent, 'demo');
  try {
    for (const [path, contents] of Object.entries(files)) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), contents);
    }
    return await runGreenfieldMission({ repositoryRoot: root, projectName: 'demo' });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
};

describe('loopback-only listeners never make init worse than main', () => {
  for (const fixture of LOOPBACK_LISTENER_FIXTURES) {
    it(fixture.name, async () => {
      const main = recorded[fixture.name];
      expect(main).toBeDefined();
      const result = await run(fixture.files);
      const resources = Object.fromEntries(
        Object.entries(result.composition.config.resources).map(([name, resource]) => [name, resource.type])
      );
      const leftOut = result.facts.nonServiceListeners.map(({ path }) => path);
      if (fixture.omitted === undefined) {
        expect(leftOut).toEqual([]);
        expect(resources).toEqual(main!);
        return;
      }
      expect(leftOut).toEqual([fixture.omitted]);
      const lost = Object.keys(main!).filter((name) => !(name in resources));
      expect(lost.length).toBeLessThanOrEqual(1);
      expect(resources).toEqual(Object.fromEntries(Object.entries(main!).filter(([name]) => !lost.includes(name))));
      expect(result.composition.gaps.some((gap) => gap.message.startsWith(`${fixture.omitted} listens only`))).toBe(
        true
      );
    });
  }
});
