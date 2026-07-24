import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('release workflow', () => {
  test('only invokes scripts declared in package.json', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const workflow = await readFile(join(process.cwd(), '.github', 'workflows', 'release.yml'), 'utf8');
    const invokedScripts = [...workflow.matchAll(/\bbun run ([^\s\\]+)/g)]
      .map((match) => match[1])
      .filter((script) => !script.includes('/'));

    expect(invokedScripts.length).toBeGreaterThan(0);
    for (const script of invokedScripts) {
      expect(packageJson.scripts).toHaveProperty(script);
    }
  });

  test('generates checksums before packaging and publishing release assets', async () => {
    const workflow = await readFile(join(process.cwd(), '.github', 'workflows', 'release.yml'), 'utf8');
    const checksumsIndex = workflow.indexOf('bun run release:checksums');
    const npmBuildIndex = workflow.indexOf('bun run build:npm');
    const npmVerifyIndex = workflow.indexOf('bun scripts/verify-npm-package.ts --require-checksums');
    const releaseIndex = workflow.indexOf('create-github-release.ts');

    expect(checksumsIndex).toBeGreaterThan(-1);
    expect(npmBuildIndex).toBeGreaterThan(checksumsIndex);
    expect(npmVerifyIndex).toBeGreaterThan(npmBuildIndex);
    expect(releaseIndex).toBeGreaterThan(npmVerifyIndex);
    expect(workflow).toContain('bun run build:npm --version $' + '{{ inputs.version }} --require-checksums');
  });
});
