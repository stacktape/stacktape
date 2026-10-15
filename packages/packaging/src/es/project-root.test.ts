import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findProjectRoot } from './project-root';

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

/** A workspace with an application below it whose `.git` is `gitMarker`, or which has none. */
const createWorkspace = async (gitMarker: 'clone' | 'worktree' | 'submodule' | 'none') => {
  const workspace = await mkdtemp(join(tmpdir(), 'stacktape-project-root-'));
  temporaryRoots.push(workspace);
  const application = join(workspace, 'apps', 'application');
  await mkdir(join(application, 'src'), { recursive: true });
  await mkdir(join(workspace, '.git'));
  await writeFile(join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
  await writeFile(join(workspace, 'package.json'), '{"name":"workspace"}');
  await writeFile(join(application, 'package.json'), '{"name":"application"}');
  if (gitMarker === 'clone') await mkdir(join(application, '.git'));
  if (gitMarker === 'worktree')
    await writeFile(join(application, '.git'), 'gitdir: /repo/.git/worktrees/application\n');
  if (gitMarker === 'submodule') await writeFile(join(application, '.git'), 'gitdir: ../../.git/modules/application\n');
  return { workspace, application };
};

test.each([
  ['a clone inside another workspace is its own project', 'clone', 'application'],
  ['a worktree inside another workspace is its own project', 'worktree', 'application'],
  ['a submodule belongs to its superproject workspace', 'submodule', 'workspace'],
  ['a workspace package belongs to its workspace', 'none', 'workspace']
] as const)('%s', async (_label, gitMarker, expected) => {
  const { workspace, application } = await createWorkspace(gitMarker);
  expect(await findProjectRoot(join(application, 'src'))).toBe(expected === 'workspace' ? workspace : application);
});
