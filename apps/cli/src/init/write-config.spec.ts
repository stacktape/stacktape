import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { parse } from 'yaml';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import * as authoring from '@stacktape/config-authoring';
import { projectSettingsFromSource } from '@domain-services/config-manager/project-settings';
import { renderTypeScript, renderYaml, writeComposedConfig } from './write-config';

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
 * The Stacktape import is replaced by parameters, which is the smallest thing that turns a module into
 * something callable without a bundler. Everything else — the classes, `defineConfig`, the
 * compilation they perform — is the real implementation the user's own file would use.
 */
const evaluateEmitted = (source: string): Record<string, unknown> => {
  const factory = new Function(
    'exports',
    'defineConfig',
    ...Object.keys(authoring).filter((name) => name !== 'defineConfig'),
    source
      .replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]stacktape['"];?\s*/m, '')
      .replace('export default', 'exports.default =')
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

  it('declare the project name and region where the CLI reads them without running the config', async () => {
    const composed = composition();
    const typescript = await renderTypeScript(composed, { region: 'eu-central-1' });
    const yaml = parse(renderYaml(composed, { region: 'eu-central-1' })) as Record<string, unknown>;

    expect(typescript).toContain(
      "export default defineConfig({ projectName: 'orders', region: 'eu-central-1' }, () => {"
    );
    expect(await projectSettingsFromSource({ source: typescript, filePath: 'stacktape.ts' })).toEqual({
      projectName: 'orders',
      region: 'eu-central-1'
    });
    expect(Object.keys(yaml).slice(0, 2)).toEqual(['projectName', 'region']);
    expect(evaluateEmitted(typescript)).toMatchObject({ projectName: 'orders', region: 'eu-central-1' });
  });
});

describe('the stacktape dev dependency of a TypeScript config', () => {
  const write = async (files: Record<string, string>, format: 'yaml' | 'typescript' = 'typescript') => {
    root = await mkdtemp(join(tmpdir(), 'stp-write-config-'));
    for (const [path, contents] of Object.entries(files)) await writeFile(join(root, path), contents, 'utf8');
    return writeComposedConfig({ repositoryRoot: root, composition: composition(), format, stacktapeVersion: '4.2.0' });
  };
  const manifest = async () => JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

  it('moves an older pin to the version that wrote the file, and names the lockfile’s package manager', async () => {
    const written = await write({
      'package.json':
        '{\n    "name": "orders",\n    "devDependencies": { "stacktape": "^3.4.0", "vitest": "3.0.0" }\n}\n',
      'pnpm-lock.yaml': ''
    });

    expect(written.devDependency).toEqual({
      specifier: 'stacktape@4.2.0',
      previousVersion: '^3.4.0',
      installCommand: 'pnpm install'
    });
    expect((await manifest()).devDependencies).toEqual({ stacktape: '4.2.0', vitest: '3.0.0' });
    // The project's own indentation is kept.
    expect(await readFile(join(root, 'package.json'), 'utf8')).toContain('\n    "name": "orders"');
  });

  it('leaves a matching pin alone', async () => {
    expect((await write({ 'package.json': '{"dependencies":{"stacktape":"4.2.0"}}' })).devDependency).toBeUndefined();
  });

  it('adds nothing to a project without a package.json, or for a YAML config', async () => {
    expect((await write({ 'go.mod': 'module x\n' })).devDependency).toBeUndefined();
    await rm(root, { recursive: true, force: true });
    expect((await write({ 'package.json': '{"name":"orders"}' }, 'yaml')).devDependency).toBeUndefined();
    expect(await manifest()).toEqual({ name: 'orders' });
  });
});
