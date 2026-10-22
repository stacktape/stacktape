import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, utimes, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodeSwapBundle } from './code-swap';

test('code edits change runnable identity; execution inputs require a new image; copies and mtimes do not', async () => {
  const root = await mkdtemp(join(tmpdir(), 'code-swap-'));
  try {
    await writeFile(join(root, 'index.mjs'), 'console.log(1)');
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'assets/a.txt'), 'asset');
    const base = {
      runtime: 'node22',
      architecture: 'amd64',
      supervisor: 'sha256:abc',
      dependencies: { express: '5.1.0' },
      environment: { A: '1' },
      build: { minify: true }
    };
    const first = await createCodeSwapBundle(root, base);
    await utimes(join(root, 'index.mjs'), new Date(), new Date());
    expect(await createCodeSwapBundle(root, { ...base })).toEqual(first);
    await writeFile(join(root, 'index.mjs'), 'console.log(2)');
    const edited = await createCodeSwapBundle(root, base);
    expect(edited.baseDigest).toBe(first.baseDigest);
    expect(edited.codeDigest).not.toBe(first.codeDigest);
    await Promise.all(
      ['runtime', 'architecture', 'supervisor', 'dependencies', 'environment', 'build'].map(async (field) => {
        expect((await createCodeSwapBundle(root, { ...base, [field]: 'changed' })).baseDigest).not.toBe(
          first.baseDigest
        );
      })
    );
    await writeFile(join(root, 'index.mjs'), 'console.log(1)');
    expect((await createCodeSwapBundle(root, base)).codeDigest).toBe(first.codeDigest);
    await symlink('/etc/passwd', join(root, 'escape'));
    await expect(createCodeSwapBundle(root, base)).rejects.toThrow('links');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
