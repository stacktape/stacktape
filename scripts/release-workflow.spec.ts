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
});
