import { describe, expect, test } from 'bun:test';
import { convertYamlToTypescript } from '@stacktape/config-authoring/converter';
import { parse as parseYaml } from 'yaml';
import { evaluateTypescriptConfig } from './typescript-config';

const YAML = `projectName: saas-starter
region: us-east-1
resources:
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserName: stacktape
        masterUserPassword: $Secret('saas-starter-mainDatabase.password')
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t4g.micro
          version: "18"
  app:
    type: nextjs-web
    properties:
      appDirectory: .
      environment:
        - name: POSTGRES_URL
          value: $ResourceParam('mainDatabase', 'connectionString')
      connectTo:
        - mainDatabase
`;

const evaluate = (source: string) =>
  evaluateTypescriptConfig({ source, projectName: 'saas-starter', region: 'us-east-1' });

describe('evaluateTypescriptConfig', () => {
  test('a generated stacktape.ts evaluates to the configuration it was generated from', async () => {
    const result = await evaluate(convertYamlToTypescript(YAML));
    expect('yaml' in result).toBe(true);
    if (!('yaml' in result)) return;
    const config = parseYaml(result.yaml) as { resources: Record<string, { type: string; properties: unknown }> };
    expect(Object.keys(config.resources)).toEqual(['mainDatabase', 'app']);
    expect(config.resources.mainDatabase!.type).toBe('relational-database');
    expect(JSON.stringify(config.resources.app)).toContain("$ResourceParam('mainDatabase', 'connectionString')");
  });

  test('an edit shows in the configuration', async () => {
    const source = convertYamlToTypescript(YAML).replace('db.t4g.micro', 'db.t4g.small');
    const result = await evaluate(source);
    expect('yaml' in result && result.yaml).toContain('db.t4g.small');
  });

  test('a syntax error says what and on which line', async () => {
    const source = convertYamlToTypescript(YAML).replace('appDirectory:', 'appDirectory');
    const result = await evaluate(source);
    expect(result).toMatchObject({ error: expect.any(String), line: expect.any(Number) });
  });

  test('a loop that never ends fails the evaluation instead of stalling the wizard', async () => {
    const started = Date.now();
    const result = await evaluate(
      "import { defineConfig } from 'stacktape';\nexport default defineConfig(() => { while (true) {} });\n"
    );
    expect(result).toMatchObject({ error: expect.stringContaining('did not finish') });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test('another import is refused with the reason', async () => {
    const result = await evaluate("import { readFileSync } from 'node:fs';\nexport default readFileSync;\n");
    expect(result).toMatchObject({ error: expect.stringContaining("imports 'node:fs'") });
  });

  test('a file without a default export says so', async () => {
    const result = await evaluate("import { defineConfig } from 'stacktape';\nexport const config = 1;\n");
    expect(result).toMatchObject({ error: expect.stringContaining('no default export') });
  });
});
