/**
 * The shipped `overrides` examples synthesize, and every property they set lands on the child resource they name.
 *
 * Seventh dogfood (r2ll): the schema's example used the path `Properties.StorageEncrypted`, and following it made a
 * DynamoDB table override `Properties.Properties.TimeToLiveSpecification`, which CloudFormation rejected only during
 * the deployment. The guide named child resources `StpLambdaFunction` and similar, which the CLI does not know. This
 * test reads the examples from the schema's JSDoc and from the guide and runs each through the real synthesis.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import get from 'lodash/get';
import { defineConfig, DynamoDbTable } from '@stacktape/config-authoring';
import { parseYaml } from '@utils/yaml';
import { configManager } from '@domain-services/config-manager';
import { RESOURCE_TYPES_WITH_A_PROPERTIES_PROPERTY } from '../../src/domain/template-manager/resource-overrides';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const repositoryRoot = join(import.meta.dir, '..', '..', '..', '..');
const guidePath = join(repositoryRoot, 'apps/docs/content/configuration/overrides-and-escape-hatches.mdx');
const schemaPath = join(repositoryRoot, 'packages/config/src/shared.ts');
const authoringEntry = join(repositoryRoot, 'packages/config-authoring/src/index.ts');

const authoringParams: Parameters<ReturnType<typeof defineConfig>>[0] = {
  projectName: 'characterization',
  stage: 'baseline',
  region: 'eu-west-1',
  cliArgs: {} as never,
  command: 'synth',
  awsProfile: '',
  user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
};

type Example = { source: string; lang: 'yaml' | 'typescript'; code: string };

/** The YAML example of the `ResourceOverrides` JSDoc, without the comment markers and focus lines. */
const readSchemaExample = async (): Promise<Example> => {
  const source = await readFile(schemaPath, 'utf8');
  const doc = source.slice(source.lastIndexOf('/**', source.indexOf('export type ResourceOverrides')));
  const block = /```yaml\n([\s\S]*?) \* ```/.exec(doc)![1]!;
  const code = block
    .split('\n')
    .map((line) => line.replace(/^ \* ?/, ''))
    .filter((line) => !line.includes('stp-focus') && !line.includes('stp-end-focus'))
    .join('\n');
  return { source: 'ResourceOverrides JSDoc', lang: 'yaml', code };
};

/** Every code tab of the guide that uses `overrides` or `transforms`. */
const readGuideExamples = async (): Promise<Example[]> => {
  const guide = await readFile(guidePath, 'utf8');
  return [...guide.matchAll(/lang: '(yaml|typescript)',\n\s*code: `([\s\S]*?)`\n/g)]
    .map(([, lang, code]) => ({ source: 'overrides guide', lang: lang as Example['lang'], code: code! }))
    .filter(({ code }) => /\b(overrides|transforms):/.test(code));
};

const workingDir = mkdtempSync(join(tmpdir(), 'stacktape-documented-overrides-'));
mkdirSync(join(workingDir, 'src'));
for (const file of ['handler.ts', 'server.ts'])
  writeFileSync(join(workingDir, 'src', file), 'export default () => {};\n');
afterAll(() => rm(workingDir, { recursive: true, force: true }));

// The examples read the database password from a secret. Synthesized as `stacktape validate` does it, a secret that
// does not exist yet becomes a placeholder reference instead of an AWS request.
const asValidate = {
  synthesisContext: { command: 'validate' as const },
  beforeFinalize: () => configManager.reportSecretsMissing(['db-password'])
};

const synthesizeExample = async ({ lang, code }: Example, index: number) => {
  if (lang === 'yaml') {
    const configPath = join(workingDir, `example-${index}.yml`);
    await writeFile(configPath, code);
    const overrides = Object.fromEntries(
      Object.values((parseYaml(code) as { resources: Record<string, { overrides?: object }> }).resources).flatMap(
        (resource) => Object.entries(resource.overrides ?? {})
      )
    );
    return { template: await synthesizeFixture({ configPath, workingDir, ...asValidate }), overrides };
  }
  // The examples import from `stacktape`, the package a project installs; here that is the authoring source.
  const modulePath = join(workingDir, `example-${index}.ts`);
  await writeFile(modulePath, code.replace(/from 'stacktape'/g, `from ${JSON.stringify(authoringEntry)}`));
  const { default: config } = (await import(modulePath)) as { default: ReturnType<typeof defineConfig> };
  const compiledConfig = config(authoringParams);
  const overrides = Object.fromEntries(
    Object.values(compiledConfig.config.resources as Record<string, { overrides?: object }>).flatMap((resource) =>
      Object.entries(resource.overrides ?? {})
    )
  );
  return { template: await synthesizeFixture({ compiledConfig, workingDir, ...asValidate }), overrides };
};

const expectOverridesApplied = (template: CloudFormationTemplate, overrides: Record<string, unknown>) => {
  for (const [logicalId, properties] of Object.entries(overrides)) {
    const resource = template.Resources[logicalId] as { Properties: Record<string, unknown> } | undefined;
    expect({ logicalId, exists: Boolean(resource) }).toEqual({ logicalId, exists: true });
    expect(resource!.Properties).not.toHaveProperty('Properties');
    for (const [path, value] of Object.entries(properties as Record<string, unknown>)) {
      // A literal map key with a dot (an RDS parameter) is kept whole; every other path is nested.
      const actual = get(resource!.Properties, path) ?? get(resource!.Properties, [path]);
      if (value && typeof value === 'object')
        expect({ logicalId, path, actual }).toMatchObject({ logicalId, path, actual: value });
      else expect({ logicalId, path, actual }).toEqual({ logicalId, path, actual: value });
    }
  }
};

describe('documented overrides', () => {
  test('the ResourceOverrides example sets its property on the database instance', async () => {
    const example = await readSchemaExample();
    const { template, overrides } = await synthesizeExample(example, 0);
    expect(Object.keys(overrides)).toEqual(['MainDbDbInstance']);
    expectOverridesApplied(template, overrides);
    expect(
      (template.Resources.MainDbDbInstance as { Properties: Record<string, unknown> }).Properties.StorageEncrypted
    ).toBe(true);
  });

  test('every override and transform example of the guide synthesizes onto the child it names', async () => {
    const examples = await readGuideExamples();
    expect(examples.length).toBeGreaterThanOrEqual(7);
    for (const [index, example] of examples.entries()) {
      const { template, overrides } = await synthesizeExample(example, index + 1);
      expectOverridesApplied(template, overrides);
    }
  });

  test('an override path that starts with Properties is rejected with the path it means', async () => {
    const config = defineConfig(() => {
      const mainTable = new DynamoDbTable({
        primaryKey: { partitionKey: { name: 'id', type: 'string' } },
        overrides: { MainTableGlobalTable: { Properties: { TimeToLiveSpecification: { Enabled: true } } } }
      });
      return { resources: { mainTable } };
    });
    await expect(synthesizeFixture({ compiledConfig: config(authoringParams), workingDir })).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_OVERRIDE_PATH_INVALID',
      hints: ['Move the keys inside `Properties` one level up, directly under `MainTableGlobalTable`.']
    });

    const yamlPath = join(workingDir, 'properties-prefix.yml');
    await writeFile(
      yamlPath,
      [
        'resources:',
        '  mainTable:',
        '    type: dynamo-db-table',
        '    properties:',
        '      primaryKey:',
        '        partitionKey: { name: id, type: string }',
        '    overrides:',
        '      MainTableGlobalTable:',
        '        Properties:',
        '          TimeToLiveSpecification: { Enabled: true, AttributeName: expiresAt }',
        ''
      ].join('\n')
    );
    await expect(synthesizeFixture({ configPath: yamlPath, workingDir })).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_OVERRIDE_PATH_INVALID',
      hints: ['Move the keys inside `Properties` one level up, directly under `MainTableGlobalTable`.']
    });
  });

  test('the resource types with a property named Properties are those of the CloudFormation types', async () => {
    const generated = join(repositoryRoot, 'packages/cloudformation/generated');
    const index = await readFile(join(generated, 'resource-types.ts'), 'utf8');
    const typeOfFile = new Map(
      [...index.matchAll(/import type \{ (\w+) as (\w+) \} from '\.\/resources\/([\w-]+)'/g)].map(
        ([, , alias, file]) => [file!, new RegExp(`'([\\w:]+)': ${alias};`).exec(index)?.[1]]
      )
    );
    const withPropertiesProperty: string[] = [];
    for (const file of await readdir(join(generated, 'resources'))) {
      const source = await readFile(join(generated, 'resources', file), 'utf8');
      // The resource's own properties are the first exported type.
      const own = /export type \w+Properties = \{\n([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
      if (/^ {2}Properties\??:/m.test(own)) withPropertiesProperty.push(typeOfFile.get(file.replace(/\.ts$/, ''))!);
    }
    expect(withPropertiesProperty.sort()).toEqual([...RESOURCE_TYPES_WITH_A_PROPERTIES_PROPERTY].sort());
  });
});
