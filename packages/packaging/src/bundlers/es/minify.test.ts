/*
 * What the minify default does to a deployed bundle, checked on the bundle Node actually runs: the
 * names a stack trace shows are the user-visible contract, not the bytes.
 */
import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEsCode } from './index';

const failingHandler = [
  'function computeDiscount(order) {',
  '  throw new Error(`no discount for ${order.id}`);',
  '}',
  'export const handler = () => computeDiscount({ id: "o-1" });'
].join('\n');

const buildAndThrow = async ({ minify, minifyIdentifiers }: { minify?: boolean; minifyIdentifiers?: boolean }) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stacktape-minify-build-'));
  const outputPath = join(outputDirectory, 'index.js');
  try {
    await buildEsCode({
      rawCode: failingHandler,
      distPath: outputPath,
      externals: [],
      minify,
      minifyIdentifiers,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      cwd: process.cwd(),
      createPackagingError: ({ message }) => new Error(message)
    });
    const bundle = await readFile(outputPath, 'utf8');
    const child = Bun.spawn(
      [
        'node',
        '-e',
        `try { require(${JSON.stringify(outputPath)}).handler() } catch (error) { console.log(error.stack) }`
      ],
      { stderr: 'pipe', stdout: 'pipe' }
    );
    const [stack, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    return { bundle, stack };
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
};

test('by default the bundle is compressed but a stack trace still names the function that threw', async () => {
  const { bundle, stack } = await buildAndThrow({});
  expect(stack).toContain('no discount for o-1');
  expect(stack).toContain('at computeDiscount');
  // Whitespace minification: the indented source line is gone.
  expect(bundle).not.toContain('\n  throw');
});

test('shortening identifiers is an opt-in, and it takes the function name out of the trace', async () => {
  const { stack } = await buildAndThrow({ minifyIdentifiers: true });
  expect(stack).toContain('no discount for o-1');
  expect(stack).not.toContain('computeDiscount');
});

test('turning minification off deploys the code as written', async () => {
  const { bundle, stack } = await buildAndThrow({ minify: false });
  expect(stack).toContain('at computeDiscount');
  expect(bundle).toContain('function computeDiscount(order)');
});
