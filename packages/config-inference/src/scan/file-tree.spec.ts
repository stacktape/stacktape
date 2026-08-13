import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { listRepositoryFiles, renderFileTree } from './file-tree';

let root: string;

const write = async (relativePath: string, contents = 'x') => {
  const absolute = join(root, relativePath);
  await mkdir(join(absolute, '..'), { recursive: true });
  await writeFile(absolute, contents, 'utf8');
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'config-inference-tree-'));
  await write('package.json', '{}');
  await write('docker-compose.yml');
  await write('.env', 'DATABASE_URL=postgres://secret');
  await write('certs/server.pem', 'PRIVATE KEY');
  await write('src/index.ts');
  await write('src/db.ts');
  await write('node_modules/left-pad/index.js');
  await write('apps/web/.next/build.js');
  await write('apps/web/app.tsx');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('listRepositoryFiles', () => {
  it('lists source files and skips dependency and build directories', async () => {
    const { files, truncated } = await listRepositoryFiles(root);

    expect(truncated).toBe(false);
    expect(files).toContain('package.json');
    expect(files).toContain('src/db.ts');
    expect(files).toContain('apps/web/app.tsx');
    expect(files).not.toContain('node_modules/left-pad/index.js');
    expect(files).not.toContain('apps/web/.next/build.js');
  });

  it('omits blocked credential files but keeps environment files listed', async () => {
    const { files } = await listRepositoryFiles(root);

    // The .env file is listed so probes know it exists; the policy is what stops anything reading
    // its values. A blocked credential file is not even named.
    expect(files).toContain('.env');
    expect(files).not.toContain('certs/server.pem');
  });

  it('reports truncation instead of silently returning a partial listing', async () => {
    const { files, truncated } = await listRepositoryFiles(root, { maxFiles: 2 });

    expect(truncated).toBe(true);
    expect(files).toHaveLength(2);
  });
});

describe('renderFileTree', () => {
  it('nests directories and sorts entries', () => {
    const tree = renderFileTree(['src/index.ts', 'src/db.ts', 'package.json']);

    expect(tree).toBe(['src/', '  db.ts', '  index.ts', 'package.json'].join('\n'));
  });

  it('caps repetitive files per extension and reports how many it left out', () => {
    const components = Array.from({ length: 40 }, (_, index) => `src/components/Component${index}.tsx`);

    const tree = renderFileTree(components, { maxPerExtensionPerDirectory: 3 });

    expect(tree).toContain('Component0.tsx');
    expect(tree).toContain('… 37 more .tsx files');
    // The point of the count: a directory of 40 components must not read as a directory of 3.
    expect(tree).not.toContain('Component9.tsx');
  });

  it('counts separately per extension so one noisy type does not hide another', () => {
    const files = [
      ...Array.from({ length: 6 }, (_, index) => `src/a${index}.ts`),
      ...Array.from({ length: 5 }, (_, index) => `src/b${index}.css`)
    ];

    const tree = renderFileTree(files, { maxPerExtensionPerDirectory: 2 });

    expect(tree).toContain('… 4 more .ts files');
    expect(tree).toContain('… 3 more .css files');
  });
});
