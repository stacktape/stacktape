import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, utimes, symlink, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import { buildSupervisor } from './build-supervisor';

// Real public-subpath consumer: bundle installed packages, apply with the built Go extractor, execute with Node.
const main = async () => {
  const root = await mkdtemp(join(tmpdir(), 'code-swap-consumer-'));
  const run = async (args: string[]) => {
    const child = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    assert.equal(await child.exited, 0, err);
    return out.trim();
  };
  try {
    const supervisor = await buildSupervisor(join(root, 'build'));
    const source = join(root, 'source.mjs'),
      output = join(root, 'output');
    await mkdir(output);
    const base = {
      manifest: await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
      lock: await readFile(new URL('../../pnpm-lock.yaml', import.meta.url), 'utf8'),
      runtime: 'node22',
      environment: { MODE: 'test' },
      build: { minify: true },
      plan: null,
      supervisor: 'qualified-binary',
      architecture: 'amd64',
      patches: {}
    };
    const build = async (value: string) => {
      // Resolve actual installed packages from this workspace, outside the temporary source directory.
      await writeFile(
        source,
        `import {z} from ${JSON.stringify(fileURLToPath(import.meta.resolve('zod')))}; import lodash from ${JSON.stringify(fileURLToPath(import.meta.resolve('lodash')))}; console.log(JSON.stringify(z.object({value:z.string()}).parse({value:lodash.camelCase(${JSON.stringify(value)})})));`
      );
      const result = await Bun.build({
        entrypoints: [source],
        outdir: output,
        naming: 'index.mjs',
        target: 'node',
        minify: true
      });
      assert(result.success);
      await writeFile(join(output, 'asset.txt'), 'consumer asset');
      return createCodeSwapBundle(output, base);
    };
    const first = await build('old consumer');
    await utimes(join(output, 'index.mjs'), new Date(), new Date());
    assert.deepEqual(await createCodeSwapBundle(output, { ...base }), first);
    const edited = await build('new consumer');
    assert.notEqual(edited.codeDigest, first.codeDigest);
    assert.equal(edited.baseDigest, first.baseDigest);
    for (const field of Object.keys(base)) {
      const changed = await createCodeSwapBundle(output, { ...base, [field]: 'changed' });
      assert.notEqual(changed.baseDigest, edited.baseDigest, field);
      assert.equal(changed.codeDigest, edited.codeDigest, field);
    }
    const back = await build('old consumer');
    assert.equal(back.codeDigest, first.codeDigest);
    assert.notEqual(back.codeDigest, edited.codeDigest);
    for (const [name, bundle, expected] of [
      ['image-source', first, 'oldConsumer'],
      ['overlay', edited, 'newConsumer'],
      ['back-to-image-source', back, 'oldConsumer']
    ] as const) {
      const archive = join(root, `${name}.tgz`),
        destination = join(root, name);
      await writeFile(archive, bundle.bytes);
      await run([supervisor, 'apply', archive, bundle.sha256, String(bundle.size), destination]);
      assert.equal(JSON.parse(await run(['node', join(destination, 'index.mjs')])).value, expected);
      assert.equal(await readFile(join(destination, 'asset.txt'), 'utf8'), 'consumer asset');
    }
    await chmod(join(output, 'index.mjs'), 0o755);
    assert.notEqual((await createCodeSwapBundle(output, base)).codeDigest, first.codeDigest);
    await symlink('/etc/passwd', join(output, 'escape'));
    await assert.rejects(createCodeSwapBundle(output, base), /links/);
    console.log(
      'B8 PASS: installed zod/lodash execute through deterministic archives; dependency/env/runtime/plan/build/supervisor/architecture/patch changes invalidate base; swap back changes running code. Archive links refused.'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
