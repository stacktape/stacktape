import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
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
  await write('deps/phoenix/priv/templates/phx.gen.release/Dockerfile.eex');
  await write('_build/prod/lib/customer_notifications/ebin/app.beam');
  await write('apps/web/.next/build.js');
  await write('apps/web/app.tsx');
  await write(
    '.github/workflows/release.yml',
    [
      'steps:',
      '  - run: docker build -f ./build/package/servers.dockerfile .',
      '  - uses: docker/build-push-action@v6',
      '    with:',
      '      file: dist/release/custom.dockerfile',
      ''
    ].join('\n')
  );
  await write('build/package/servers.dockerfile');
  await write('dist/release/custom.dockerfile');
  await write('build/output/copied.dockerfile');
  await write('build/output/server.js');
  await write('apps/api/build/package/server.js');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('listRepositoryFiles', () => {
  it('lists source files and skips dependency and build directories', async () => {
    const { files, truncated, descriptorDockerfiles } = await listRepositoryFiles(root);

    expect(truncated).toBe(false);
    expect(files).toContain('package.json');
    expect(files).toContain('src/db.ts');
    expect(files).toContain('apps/web/app.tsx');
    expect(files).not.toContain('node_modules/left-pad/index.js');
    expect(files).not.toContain('deps/phoenix/priv/templates/phx.gen.release/Dockerfile.eex');
    expect(files).not.toContain('_build/prod/lib/customer_notifications/ebin/app.beam');
    expect(files).not.toContain('apps/web/.next/build.js');
    expect(files).toContain('build/package/servers.dockerfile');
    expect(files).toContain('dist/release/custom.dockerfile');
    expect(descriptorDockerfiles).toEqual(['build/package/servers.dockerfile', 'dist/release/custom.dockerfile']);
    expect(files).not.toContain('build/output/copied.dockerfile');
    expect(files).not.toContain('build/output/server.js');
    expect(files).not.toContain('apps/api/build/package/server.js');
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

  it('records a contained Dockerfile symlink with its canonical target', async () => {
    const linkedRoot = await mkdtemp(join(tmpdir(), 'config-inference-tree-linked-'));
    try {
      await mkdir(join(linkedRoot, 'docker'), { recursive: true });
      await writeFile(join(linkedRoot, 'docker/Dockerfile.production'), 'FROM node:24\n', 'utf8');
      await symlink('docker/Dockerfile.production', join(linkedRoot, 'Dockerfile'), 'file');

      const listing = await listRepositoryFiles(linkedRoot);

      expect(listing.files).toContain('Dockerfile');
      expect(listing.files).toContain('docker/Dockerfile.production');
      expect(listing.dockerfileSymlinks).toEqual([{ path: 'Dockerfile', target: 'docker/Dockerfile.production' }]);
    } finally {
      await rm(linkedRoot, { recursive: true, force: true });
    }
  });

  it('does not admit escaped or broken Dockerfile symlinks', async () => {
    const linkedRoot = await mkdtemp(join(tmpdir(), 'config-inference-tree-linked-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'config-inference-tree-outside-'));
    try {
      const outsideDockerfile = join(outsideRoot, 'Dockerfile.production');
      await writeFile(outsideDockerfile, 'FROM malicious:latest\n', 'utf8');
      await symlink(outsideDockerfile, join(linkedRoot, 'Dockerfile.escaped'), 'file');
      await symlink('docker/Dockerfile.missing', join(linkedRoot, 'Dockerfile.broken'), 'file');

      const listing = await listRepositoryFiles(linkedRoot);

      expect(listing.files).not.toContain('Dockerfile.escaped');
      expect(listing.files).not.toContain('Dockerfile.broken');
      expect(listing.dockerfileSymlinks).toEqual([]);
    } finally {
      await rm(linkedRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('bounds descriptor-named Dockerfiles before filesystem inspection', async () => {
    const boundedRoot = await mkdtemp(join(tmpdir(), 'config-inference-tree-bound-'));
    const references = Array.from(
      { length: 80 },
      (_, index) => `build/generated/server-${String(index).padStart(2, '0')}.dockerfile`
    );
    try {
      await mkdir(join(boundedRoot, '.github/workflows'), { recursive: true });
      await mkdir(join(boundedRoot, 'build/generated'), { recursive: true });
      await writeFile(
        join(boundedRoot, '.github/workflows/release.yml'),
        ['steps:', ...references.map((file) => `  - run: docker build -f ${file} .`), ''].join('\n'),
        'utf8'
      );
      await Promise.all(references.map((file) => writeFile(join(boundedRoot, file), 'FROM scratch\n', 'utf8')));

      const listing = await listRepositoryFiles(boundedRoot);

      expect(listing.descriptorDockerfiles).toEqual(references.slice(0, 32));
      expect(listing.files.filter((file) => file.startsWith('build/generated/'))).toEqual(references.slice(0, 32));
      expect(listing.files).not.toContain(references[32]);
    } finally {
      await rm(boundedRoot, { recursive: true, force: true });
    }
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
