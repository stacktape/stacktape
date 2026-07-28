import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_BRIDGE_PATH, CONFIG_PACKAGE_SRC_PATH } from '../../shared/naming/project-fs-paths';
import { listConfigSourceFiles, resolveConfigSourceFile } from '../../scripts/code-generation/config-sources';
import { getJsonSchemaGenerator } from '../../scripts/code-generation/utils';
import { readPackageDeclarations } from '../../scripts/generate-config-bridge';

/**
 * The published config schema is generated from `@stacktape/config`. These are semantic probes, not a snapshot:
 * the generator's union ordering is not reproducible (see apps/cli/AGENTS.md), so ordering is deliberately not
 * asserted, while membership, reachability, root shape and documentation content are.
 */
let cachedSchema: Promise<any> | undefined;
const configSchema = () => {
  // `getSchemaForSymbol` rather than `generateConfigSchema`: the latter writes the committed schema file as a
  // side effect, and running the tests must not modify a generated artifact.
  cachedSchema ??= getJsonSchemaGenerator().then((generator) => generator.getSchemaForSymbol('StacktapeConfig'));
  return cachedSchema;
};

describe('the configuration model is owned by @stacktape/config', () => {
  test('every configuration source is discovered, and discovery fails closed', () => {
    const sources = listConfigSourceFiles();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.filter((file) => file.includes('packages'))).not.toBeEmpty();
    expect(() => resolveConfigSourceFile('there-is-no-such-model.d.ts')).toThrow('No @stacktape/config module');
  });

  test('logical documentation source names still resolve', () => {
    // These names are recorded in src/api/npm/ts/class-config.ts, which drives the published npm declarations.
    for (const logicalName of ['functions.d.ts', 'web-services.d.ts', '__helpers.d.ts', '_root.d.ts', 'buckets.d.ts']) {
      expect(resolveConfigSourceFile(logicalName)).toStartWith(CONFIG_PACKAGE_SRC_PATH);
    }
  });

  test('the schema still describes the same configuration language', async () => {
    const schema = await configSchema();

    expect(Object.keys(schema.definitions)).toHaveLength(449);
    expect(Object.keys(schema.properties).sort()).toEqual(
      [
        'cloudformationResources',
        'directives',
        'hooks',
        'variables',
        'providerConfig',
        'resources',
        'scripts',
        'serviceName',
        'stackConfig',
        'deploymentConfig'
      ].sort()
    );
    expect(schema.definitions.StacktapeResourceDefinition.anyOf).toHaveLength(44);
    // The escape hatch and its value vocabulary are still reachable from the root.
    expect(schema.definitions.IntrinsicFunction).toEqual({
      type: 'object',
      properties: { name: { type: 'string' }, payload: {} },
      additionalProperties: false,
      required: ['name', 'payload']
    });
  });

  test('product documentation survives the move into the package', async () => {
    const schema = await configSchema();

    expect(schema.properties.serviceName.description).toContain('#### The name of this service.');
    expect(schema.definitions.LambdaFunction.description).toContain('serverless compute resource');
    // Examples are the documented product content the schema, docs and editor hovers all render.
    const descriptions = JSON.stringify(schema);
    expect(descriptions.split('**Example (YAML):**').length - 1).toBeGreaterThan(900);
    expect(descriptions.split('**Example (TypeScript):**').length - 1).toBeGreaterThan(900);
  });
});

describe('the ambient bridge is temporary and countable', () => {
  test('it aliases exactly what the package exports, and nothing is hand-authored', () => {
    const declarations = readPackageDeclarations(CONFIG_PACKAGE_SRC_PATH);
    const bridge = readFileSync(CONFIG_BRIDGE_PATH, 'utf-8');

    expect(declarations.length).toBeGreaterThan(400);
    for (const { name, specifier } of declarations) {
      expect(bridge).toContain(`type ${name} = import('${specifier}').${name};`);
    }
    // Aliases go through the specifiers the export map publishes, not through internal module paths.
    expect(bridge).toContain("type StacktapeConfig = import('@stacktape/config').StacktapeConfig;");
    expect(bridge).not.toContain('@stacktape/config/_root');
    expect(bridge).not.toContain('@stacktape/config/__helpers');
    // Every line is a generated alias: no hand-written declaration can hide here.
    const aliasLines = bridge.split('\n').filter((line) => line.startsWith('type '));
    expect(aliasLines).toHaveLength(declarations.length);
  });

  test('the configuration model no longer reads the CLI resolver back through a type query', () => {
    // The general "packages do not import apps" rule is enforced by dependency-cruiser, which resolves the real
    // module graph. This pins only the specific historical edge: `ConnectToAwsServicesMacro` used to be
    // `typeof import('../../src/domain/config-manager/utils/resource-references')[...]`, which dragged a CLI
    // module that imports tuiManager and configManager into the published schema program.
    const macros = readFileSync(join(CONFIG_PACKAGE_SRC_PATH, 'aws-service-macros.ts'), 'utf-8');
    expect(macros).toContain('export const CONNECT_TO_AWS_SERVICE_MACROS');
    expect(macros).toContain('export type ConnectToAwsServicesMacro = (typeof CONNECT_TO_AWS_SERVICE_MACROS)[number]');

    const resolver = readFileSync(join('src', 'domain', 'config-manager', 'utils', 'resource-references.ts'), 'utf-8');
    expect(resolver).toContain("from '@stacktape/config/aws-service-macros'");
    expect(resolver).not.toContain('export const ConnectToAwsServiceMacros');
  });
});
