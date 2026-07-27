import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { scanStacktapeProject } from './project-scan';

describe('MCP project scan', () => {
  test('finds Stacktape config files and package context', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-scan-'));
    try {
      await writeFile(
        join(cwd, 'package.json'),
        JSON.stringify(
          {
            name: 'scan-test',
            packageManager: 'bun@1.3.9',
            scripts: {
              deploy: 'stacktape deploy --stage dev',
              test: 'bun test'
            },
            dependencies: {
              stacktape: '3.7.0'
            }
          },
          null,
          2
        )
      );
      await writeFile(
        join(cwd, 'stacktape.ts'),
        `import { defineConfig, Function } from 'stacktape';
export default defineConfig(() => ({
  resources: {
    api: new Function({}),
    worker: new Function({})
  }
}));
`
      );
      await writeFile(join(cwd, 'bun.lock'), '');

      const result = await scanStacktapeProject({ cwd });

      expect(result.totalConfigCandidates).toBe(1);
      expect(result.omittedConfigCandidates).toBe(0);
      expect(result.primaryConfigCandidates).toHaveLength(1);
      expect(result.configCandidates).toHaveLength(1);
      expect(result.configCandidates[0]).toMatchObject({
        path: 'stacktape.ts',
        format: 'typescript',
        importsStacktape: true,
        usesDefineConfig: true
      });
      expect(result.configCandidates[0].resourceConstructors).toContain('Function');
      expect(result.configCandidates[0].likelyResourceKeys).toEqual(['api', 'worker']);
      expect(result.packageJsonFiles[0]).toMatchObject({
        path: 'package.json',
        name: 'scan-test',
        stacktapeDependency: '3.7.0',
        relevantScripts: {
          deploy: 'stacktape deploy --stage dev'
        }
      });
      expect(result.lockfiles).toEqual(['bun.lock']);
      expect(result.suggestedDefaults).toEqual({
        configPath: 'stacktape.ts',
        currentWorkingDirectory: '.'
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
