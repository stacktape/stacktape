import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { isIgnored, parseGitignore, readRepositoryTree } from './repository-tree';

let root: string;
const write = async (path: string, text = '') => {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), text);
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-tree-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the repository tree', () => {
  it('lists the project and leaves out dependencies, build output, caches, virtualenvs and credentials', async () => {
    for (const path of [
      'package.json',
      '.env.example',
      'src/index.ts',
      'src/routes/users.ts',
      'node_modules/left-pad/index.js',
      '.git/config',
      'dist/index.js',
      '.next/server/app.js',
      'venv/lib/site.py',
      'api/__pycache__/main.cpython-312.pyc',
      '.mypy_cache/3.12/main.json',
      'certs/server.pem',
      '.npmrc'
    ]) {
      await write(path);
    }

    expect(await readRepositoryTree({ repositoryRoot: root })).toEqual({
      files: ['.env.example', 'package.json', 'src/index.ts', 'src/routes/users.ts'],
      truncated: false
    });
  });

  it("follows the repository's .gitignore files, including nested ones and negations", async () => {
    await write('.gitignore', '# local files\n*.log\n!keep.log\n/tmp/\ncoverage-report\nweb/generated/**\n');
    await write('web/.gitignore', 'public/build\n');
    for (const path of [
      'server.log',
      'keep.log',
      'tmp/scratch.txt',
      'src/tmp/real.ts',
      'coverage-report/index.html',
      'web/generated/client.ts',
      'web/public/build/app.js',
      'web/public/favicon.ico',
      'web/package.json'
    ]) {
      await write(path);
    }

    const { files } = await readRepositoryTree({ repositoryRoot: root });

    expect(files).toEqual([
      '.gitignore',
      'keep.log',
      'src/tmp/real.ts',
      'web/.gitignore',
      'web/package.json',
      'web/public/favicon.ico'
    ]);
  });

  it('does not follow symbolic links out of the repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'stacktape-outside-'));
    await writeFile(join(outside, 'id_rsa.txt'), 'secret');
    await write('package.json');
    await symlink(outside, join(root, 'linked'));
    await symlink(join(outside, 'id_rsa.txt'), join(root, 'key.txt'));

    expect((await readRepositoryTree({ repositoryRoot: root })).files).toEqual(['package.json']);
    await rm(outside, { recursive: true, force: true });
  });

  it('cuts a huge repository breadth-first and says so', async () => {
    await write('package.json');
    for (let index = 0; index < 30; index += 1) await write(`deep/a/b/file-${index}.ts`);
    await write('web/index.ts');

    const tree = await readRepositoryTree({ repositoryRoot: root, maxFiles: 10 });

    expect(tree.truncated).toBe(true);
    expect(tree.files).toHaveLength(10);
    // Every top-level file comes before anything deeper.
    expect(tree.files).toContain('package.json');
    expect(tree.files).toContain('web/index.ts');
  });

  it('is an empty tree for a folder that is not there', async () => {
    expect(await readRepositoryTree({ repositoryRoot: join(root, 'missing') })).toEqual({
      files: [],
      truncated: false
    });
  });
});

describe('.gitignore patterns', () => {
  const cases: Array<[pattern: string, path: string, isDirectory: boolean, ignored: boolean]> = [
    ['*.log', 'a/b/debug.log', false, true],
    ['/build', 'build', true, true],
    ['/build', 'src/build', true, false],
    ['build/', 'src/build', true, true],
    ['build/', 'build', false, false],
    ['doc/*.txt', 'doc/notes.txt', false, true],
    ['doc/*.txt', 'doc/server/notes.txt', false, false],
    ['**/fixtures', 'a/b/fixtures', true, true],
    ['logs/**', 'logs/2026/day.txt', false, true],
    ['a/**/z', 'a/b/c/z', false, true],
    ['a/**/z', 'a/z', false, true],
    ['data[0-9].csv', 'data7.csv', false, true],
    ['data?.csv', 'data10.csv', false, false],
    ['\\#notes', '#notes', false, true]
  ];
  for (const [pattern, path, isDirectory, ignored] of cases) {
    it(`${pattern} ${ignored ? 'ignores' : 'keeps'} ${path}${isDirectory ? '/' : ''}`, () => {
      expect(isIgnored(parseGitignore(pattern, ''), path, isDirectory)).toBe(ignored);
    });
  }

  it('applies a nested file only below its folder', () => {
    const rules = parseGitignore('*.ts', 'web');
    expect(isIgnored(rules, 'web/app.ts', false)).toBe(true);
    expect(isIgnored(rules, 'api/app.ts', false)).toBe(false);
  });
});
