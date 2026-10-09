import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'stacktape-j12-docs-contracts-'));
const output = join(directory, 'site');
const validate = (script = 'validate-built-site.ts') => {
  const result = spawnSync(process.execPath, [join(appRoot, 'scripts', script), '--out-dir', output], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: process.env.PATH }
  });
  if (result.error) throw result.error;
  return { status: result.status, text: result.stdout + result.stderr };
};

try {
  await cp(join(appRoot, 'dist'), output, { recursive: true });
  const valid = validate();
  assert.equal(valid.status, 0, `Build the current docs before running these contracts:\n${valid.text}`);
  const page = join(output, 'cli/deploy/index.html');
  const original = await readFile(page, 'utf8');
  const corruptions: Array<{ name: string; change: (html: string) => string; diagnostic: RegExp }> = [
    {
      name: 'broken internal link',
      change: (html) => html.replace('</body>', '<a href="/j12-missing-page/">missing</a></body>'),
      diagnostic: /cli\/deploy\/index.html: broken internal reference \/j12-missing-page\//
    },
    {
      name: 'missing fragment',
      change: (html) => html.replace('</body>', '<a href="/cli/deploy/#j12-missing-fragment">missing</a></body>'),
      diagnostic: /cli\/deploy\/index.html: missing fragment .*j12-missing-fragment/
    },
    {
      name: 'wrong canonical URL',
      change: (html) =>
        html.replace(
          'rel="canonical" href="https://docs.stacktape.com/cli/deploy/"',
          'rel="canonical" href="https://docs.stacktape.com/cli/delete/"'
        ),
      diagnostic: /cli\/deploy\/index.html: canonical is .*cli\/delete\//
    },
    {
      name: 'CLI option drift',
      change: (html) => html.replace('--stage (-s)', '--j12-obsolete-option'),
      diagnostic: /CLI reference for deploy differs from the current command metadata/
    },
    {
      name: 'missing local asset',
      change: (html) => html.replace('</body>', '<img src="/j12-missing-image.png" alt="Missing test asset" /></body>'),
      diagnostic: /broken internal reference \/j12-missing-image.png/
    }
  ];
  // Faults share one scratch page; each must be restored before applying the next.
  /* eslint-disable no-await-in-loop */
  for (const { name, change, diagnostic } of corruptions) {
    const changed = change(original);
    assert.notEqual(changed, original, `Fault ${name} must reach the built content`);
    await writeFile(page, changed);
    try {
      const rejected = validate();
      assert.equal(rejected.status, 1, `${name} must fail the build gate`);
      assert.match(rejected.text, diagnostic, `${name} must identify the broken page and contract`);
      console.info(`PASS docs build gate rejects ${name}`);
    } finally {
      await writeFile(page, original);
    }
  }
  /* eslint-enable no-await-in-loop */
  await rename(page, `${page}.j12-removed`);
  try {
    const missing = validate();
    assert.equal(missing.status, 1);
    assert.match(missing.text, /missing expected page cli\/deploy\/index.html/);
    console.info('PASS docs build gate rejects a missing canonical route');
  } finally {
    await rename(`${page}.j12-removed`, page);
  }
  const corpus = join(output, 'llms.txt');
  const originalCorpus = await readFile(corpus);
  await writeFile(corpus, 'J12 stale published corpus\n');
  try {
    const stale = validate();
    assert.equal(stale.status, 1);
    assert.match(stale.text, /llms.txt differs from the generated corpus/);
    console.info('PASS docs build gate rejects a stale served MCP corpus');
  } finally {
    await writeFile(corpus, originalCorpus);
  }
  const examplePage = join(output, 'index.html');
  const originalExample = await readFile(examplePage, 'utf8');
  // Change the actual serialized code prop consumed by the shipped CodeBlock island.
  const brokenExample = originalExample.replace('new DynamoDbTable({', 'new J12UnknownResource({');
  assert(brokenExample !== originalExample, 'Fault must reach a complete rendered config');
  await writeFile(examplePage, brokenExample);
  try {
    const invalid = validate('validate-built-examples.ts');
    assert.equal(invalid.status, 1);
    assert.match(invalid.text, /index.html complete config \d+: TS2304 Cannot find name 'J12UnknownResource'/);
    console.info('PASS docs build gate rejects an invalid rendered TypeScript config');
  } finally {
    await writeFile(examplePage, originalExample);
  }
  const configPage = join(output, 'resources/advanced/deployment-scripts/index.html');
  const originalConfig = await readFile(configPage, 'utf8');
  const configFaults = [
    {
      name: 'a misspelled config factory',
      from: 'export default defineConfig',
      to: 'export default defineConfg',
      diagnostic: /TS2552 Cannot find name 'defineConfg'/
    },
    {
      name: 'a broken config import',
      // Astro escapes quotes in the serialized code prop's HTML attribute.
      from: 'from &#39;stacktape&#39;',
      to: 'from &#39;j12-missing-stacktape&#39;',
      diagnostic: /TS2307 Cannot find module 'j12-missing-stacktape'/
    },
    {
      name: 'malformed config export syntax',
      from: 'export default defineConfig',
      to: 'export defalt defineConfig',
      diagnostic: /TS(?:1128|1434|1005)/
    }
  ];
  // Each fault changes the same complete-config page; restore it before the next compiler invocation.
  /* eslint-disable no-await-in-loop */
  for (const { name, from, to, diagnostic } of configFaults) {
    const changed = originalConfig.replaceAll(from, to);
    assert(changed !== originalConfig, 'Fault must reach the rendered complete configs');
    await writeFile(configPage, changed);
    try {
      const invalid = validate('validate-built-examples.ts');
      assert.equal(invalid.status, 1, `${name} must not remove complete configs from validation`);
      assert.match(invalid.text, /resources\/advanced\/deployment-scripts\/index.html complete config \d+: TS/);
      assert.match(invalid.text, diagnostic);
      console.info(`PASS docs build gate rejects ${name}`);
    } finally {
      await writeFile(configPage, originalConfig);
    }
  }
  /* eslint-enable no-await-in-loop */
  assert.equal(
    validate('validate-built-examples.ts').status,
    0,
    'Restoring the example must restore valid config types'
  );
  assert.equal(validate().status, 0, 'Restoring all content must restore the valid build');
} finally {
  await rm(directory, { recursive: true, force: true });
}
