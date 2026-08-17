import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { parse } from 'yaml';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import * as authoring from '@stacktape/config-authoring';
import { findExistingConfig, renderTypeScript, renderYaml, writeComposedConfig } from './write-config';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const composition = () =>
  composeConfig({
    facts: projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'api',
          path: '.',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'npm start',
          environmentVariables: [{ name: 'STRIPE_KEY', role: 'third-party-secret', required: true, evidence: [] }],
          evidence: [{ file: 'package.json', line: 3, quote: '"start"' }],
          source: 'probe'
        }
      ],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          evidence: [{ file: 'package.json', line: 7, quote: '"pg"' }],
          source: 'probe'
        }
      ]
    }),
    projectName: 'orders'
  });

/** Two services in one directory, which is what a `Procfile` with a web and a worker produces. */
const twoServiceComposition = () =>
  composeConfig({
    facts: projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'web',
          path: '.',
          language: 'python',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'gunicorn app.wsgi',
          evidence: [],
          source: 'probe'
        },
        {
          name: 'worker',
          path: '.',
          processType: 'worker',
          language: 'python',
          exposesHttp: false,
          executionModel: 'long-running',
          startCommand: 'celery -A app worker',
          evidence: [],
          source: 'probe'
        }
      ]
    }),
    projectName: 'orders'
  });

describe('renderYaml', () => {
  it('parses back as the configuration that went in', async () => {
    const parsed = parse(renderYaml(composition())) as Record<string, any>;

    expect(parsed.projectName).toBe('orders');
    expect(parsed.resources.api.type).toBe('web-service');
    expect(parsed.resources.mainDatabase.type).toBe('relational-database');
    expect(parsed.resources.api.properties.connectTo).toEqual(['mainDatabase']);
  });

  it('writes every value out, rather than referring back to one it wrote earlier', () => {
    const yaml = renderYaml(twoServiceComposition());

    // Two services sized from the same profile used to share one object, and the serialiser turned
    // the second one into `resources: *a1`. Valid YAML, and completely opaque to someone who has
    // never seen an anchor — they would also not expect editing one service to change the other.
    expect(yaml).not.toContain('&a');
    expect(yaml).not.toContain('*a');
    const parsed = parse(yaml) as Record<string, any>;
    expect(parsed.resources.web.properties.resources).toEqual(parsed.resources.worker.properties.resources);
  });

  it('keeps nested objects, arrays and numbers intact', () => {
    const parsed = parse(renderYaml(composition())) as Record<string, any>;

    expect(parsed.resources.api.properties.resources).toEqual({ cpu: 0.5, memory: 1024 });
    expect(parsed.resources.api.properties.packaging.properties.sourceDirectoryPath).toBe('.');
    expect(parsed.resources.api.properties.environment).toEqual([
      { name: 'STRIPE_KEY', value: "$Secret('stripe_key')" }
    ]);
  });

  it('quotes values YAML would otherwise misread', () => {
    const parsed = parse(renderYaml(composition())) as Record<string, any>;

    // `$Secret('...')` survives the round trip rather than becoming a broken scalar. The name is
    // project-scoped: Secrets Manager names are account-wide, and two projects must not share one.
    expect(parsed.resources.mainDatabase.properties.credentials.masterUserPassword).toBe(
      "$Secret('orders-mainDatabase.password')"
    );
  });
});

/**
 * Run the emitted module and return the configuration it defines.
 *
 * The import line is replaced by parameters, which is the smallest thing that turns a module into
 * something callable without a bundler. Everything else — the classes, `defineConfig`, the
 * compilation they perform — is the real implementation the user's own file would use.
 */
const evaluateEmitted = (source: string): Record<string, unknown> => {
  const factory = new Function(
    'exports',
    'defineConfig',
    ...Object.keys(authoring).filter((name) => name !== 'defineConfig'),
    source.replace(/^import .*$/m, '').replace('export default', 'exports.default =')
  ) as (exports: { default?: unknown }, ...injected: unknown[]) => void;

  const module: { default?: (params: Record<string, unknown>) => { config: Record<string, unknown> } } = {};
  factory(
    module,
    authoring.defineConfig,
    ...Object.entries(authoring)
      .filter(([name]) => name !== 'defineConfig')
      .map(([, value]) => value)
  );

  return module.default!({ stage: 'dev', region: 'eu-west-1', cliArgs: {}, command: 'deploy', awsProfile: 'default' })
    .config;
};

describe('the two formats', () => {
  it('describe exactly the same infrastructure', async () => {
    const composed = composition();
    // Not a string comparison, which would only prove they were edited together: this evaluates the
    // emitted TypeScript against the real authoring classes. Someone who picks TypeScript has to get
    // what the YAML user gets, or the format choice on the Review step is a trap.
    const fromTypeScript = evaluateEmitted(await renderTypeScript(composed));
    const fromYaml = parse(renderYaml(composed)) as Record<string, unknown>;

    expect(fromTypeScript.resources).toEqual(fromYaml.resources);
    expect(fromTypeScript.projectName).toEqual(fromYaml.projectName);
  });
});

describe('writeComposedConfig', () => {
  it('writes a configuration when there is none', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-write-config-'));

    const result = await writeComposedConfig({ repositoryRoot: root, composition: composition() });

    expect(result).toMatchObject({ filename: 'stacktape.yml' });
    const contents = await readFile(join(root, 'stacktape.yml'), 'utf8');
    expect(parse(contents).resources.api.type).toBe('web-service');
  });

  it('never touches a configuration that is already there', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-write-config-'));
    await writeFile(join(root, 'stacktape.yml'), '# hand written\n', 'utf8');

    const result = await writeComposedConfig({ repositoryRoot: root, composition: composition() });

    // Someone may have edited that after the last run, or deployed it. It stays as it is, and the
    // new configuration lands beside it under a name that says where it came from.
    expect(result).toMatchObject({
      filename: 'stacktape.generated.yml',
      existingPath: join(root, 'stacktape.yml')
    });
    expect(await readFile(join(root, 'stacktape.yml'), 'utf8')).toContain('hand written');
    expect(parse(await readFile(join(root, 'stacktape.generated.yml'), 'utf8')).resources.api.type).toBe('web-service');
  });

  it('writes TypeScript when asked, under the matching name', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-write-config-'));
    await writeFile(join(root, 'stacktape.yaml'), '# hand written\n', 'utf8');

    const result = await writeComposedConfig({
      repositoryRoot: root,
      composition: composition(),
      format: 'typescript'
    });

    expect(result.filename).toBe('stacktape.generated.ts');
    expect(await readFile(result.path, 'utf8')).toContain("from 'stacktape'");
  });

  it('finds an existing configuration under any of its names', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-write-config-'));
    await writeFile(join(root, 'stacktape.ts'), 'export default {};\n', 'utf8');

    expect(findExistingConfig(root)).toBe(join(root, 'stacktape.ts'));
  });
});
