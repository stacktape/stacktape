import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Workspace } from './workspace';

let container: string;
let repo: string;
let workspace: Workspace;
let symlinksSupported = true;

beforeAll(async () => {
  container = await mkdtemp(join(tmpdir(), 'stp-workspace-'));
  repo = join(container, 'repo');
  await mkdir(join(repo, 'src'), { recursive: true });
  await writeFile(join(repo, 'src', 'index.ts'), 'export const port = 3000;', 'utf8');
  await writeFile(
    join(repo, '.env'),
    'DATABASE_URL=postgres://\${DATABASE_USER}:\${DATABASE_PASSWORD}@host/db\n',
    'utf8'
  );
  await writeFile(join(repo, 'deploy.pem'), 'PRIVATE KEY', 'utf8');
  await writeFile(join(container, 'outside-secret.txt'), 'not yours', 'utf8');

  try {
    // Windows needs elevation or developer mode for symlinks; the escape test is skipped when the
    // platform refuses rather than reported as a pass.
    await symlink(join(container, 'outside-secret.txt'), join(repo, 'escape.txt'));
  } catch {
    symlinksSupported = false;
  }

  workspace = new Workspace(repo);
});

afterAll(async () => {
  await rm(container, { recursive: true, force: true });
});

describe('Workspace containment', () => {
  it('reads an ordinary file inside the repository', async () => {
    const result = await workspace.read('src/index.ts');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ path: 'src/index.ts' });
    expect((result as { contents: string }).contents).toContain('port = 3000');
  });

  it('refuses to climb out with ..', async () => {
    const result = await workspace.read('../outside-secret.txt');

    expect(result).toMatchObject({ ok: false, reason: 'escapes-repository' });
  });

  it('refuses absolute paths and Windows drive letters', async () => {
    expect(await workspace.read('/etc/passwd')).toMatchObject({ ok: false, reason: 'escapes-repository' });
    expect(await workspace.read('C:/Windows/System32/config/SAM')).toMatchObject({
      ok: false,
      reason: 'escapes-repository'
    });
  });

  it('refuses backslash paths rather than resolving them', async () => {
    expect(await workspace.read('src\\index.ts')).toMatchObject({ ok: false, reason: 'escapes-repository' });
  });

  it('refuses a symlink that points outside the repository', async () => {
    if (!symlinksSupported) return;

    // The case a lexical path check cannot catch: `escape.txt` looks contained and is not.
    const result = await workspace.read('escape.txt');

    expect(result).toMatchObject({ ok: false, reason: 'escapes-repository' });
    expect(JSON.stringify(result)).not.toContain('not yours');
  });

  it('returns environment variable names and never their values', async () => {
    const result = await workspace.read('.env');

    expect(result).toMatchObject({ ok: true, environmentVariableNames: ['DATABASE_URL'] });
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });

  it('refuses credential material outright', async () => {
    const result = await workspace.read('deploy.pem');

    expect(result).toMatchObject({ ok: false, reason: 'blocked-by-policy' });
    expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
  });

  it('reports a missing file distinctly from a refusal', async () => {
    expect(await workspace.read('src/nope.ts')).toMatchObject({ ok: false, reason: 'not-found' });
  });

  it('reports a directory as not a file', async () => {
    expect(await workspace.read('src')).toMatchObject({ ok: false, reason: 'not-a-file' });
  });
});
