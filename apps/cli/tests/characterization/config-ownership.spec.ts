import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { CONFIG_PACKAGE_SRC_PATH } from 'src/config/project-paths';
import { listConfigSourceFiles, resolveConfigSourceFile } from '../../scripts/code-generation/config-sources';
import {
  findConfigSchemaSourceFiles,
  getJsonSchemaGenerator,
  sortConfigSchemaSourcePaths
} from '../../scripts/code-generation/utils';
import * as ts from 'typescript';

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

const countDescriptions = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.description === 'string' ? 1 : 0) +
    Object.values(record).reduce<number>((count, child) => count + countDescriptions(child), 0)
  );
};

const readPackageExportNames = (): Set<string> => {
  const packageFiles = listConfigSourceFiles().filter((file) =>
    resolve(file).startsWith(resolve(CONFIG_PACKAGE_SRC_PATH))
  );
  if (packageFiles.length === 0) throw new Error(`No configuration modules found in ${CONFIG_PACKAGE_SRC_PATH}.`);
  const program = ts.createProgram(packageFiles, {
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: []
  });
  const checker = program.getTypeChecker();
  const names = new Set<string>();

  for (const file of packageFiles) {
    const sourceFile = program.getSourceFile(file);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) throw new Error(`${file} is not an importable configuration module.`);
    for (const exported of checker.getExportsOfModule(moduleSymbol)) names.add(exported.getName());
  }
  return names;
};

const readGlobalDeclarationNames = (sourceFile: ts.SourceFile): string[] => {
  const names: string[] = [];
  const visitStatements = (statements: ts.NodeArray<ts.Statement>) => {
    for (const statement of statements) {
      const named =
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement);
      if (named && statement.name) names.push(statement.name.text);
      if (
        ts.isModuleDeclaration(statement) &&
        statement.flags & ts.NodeFlags.GlobalAugmentation &&
        statement.body &&
        ts.isModuleBlock(statement.body)
      ) {
        visitStatements(statement.body.statements);
      }
    }
  };

  if (ts.isExternalModule(sourceFile)) {
    for (const statement of sourceFile.statements) {
      if (
        ts.isModuleDeclaration(statement) &&
        statement.flags & ts.NodeFlags.GlobalAugmentation &&
        statement.body &&
        ts.isModuleBlock(statement.body)
      ) {
        visitStatements(statement.body.statements);
      }
    }
  } else {
    visitStatements(sourceFile.statements);
  }

  return names;
};

const readCliGlobalDeclarationNames = (typesPath = join(process.cwd(), 'types')): Map<string, string[]> => {
  const declarations = new Map<string, string[]>();
  const files = ts.sys.readDirectory(typesPath, ['.d.ts']);
  if (files.length === 0) throw new Error(`No .d.ts files found in ${typesPath}.`);

  for (const file of files) {
    const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true);
    for (const name of readGlobalDeclarationNames(sourceFile)) {
      declarations.set(name, [...(declarations.get(name) ?? []), relative(typesPath, file)]);
    }
  }

  return declarations;
};

describe('the configuration model is owned by @stacktape/config', () => {
  test('schema source ordering is stable across filesystem path conventions', async () => {
    expect(
      sortConfigSchemaSourcePaths([
        'zeta\\nested\\last.ts',
        'alpha/shared.ts',
        'alpha\\agentcore.ts',
        'zeta/nested/first.ts'
      ])
    ).toEqual(['alpha\\agentcore.ts', 'alpha/shared.ts', 'zeta/nested/first.ts', 'zeta\\nested\\last.ts']);

    const sources = await findConfigSchemaSourceFiles();
    const cliSources = sources.filter((file) => !resolve(file).startsWith(resolve(CONFIG_PACKAGE_SRC_PATH)));
    const packageSources = sources.filter((file) => resolve(file).startsWith(resolve(CONFIG_PACKAGE_SRC_PATH)));
    expect(sources).toEqual([
      ...sortConfigSchemaSourcePaths(cliSources),
      ...sortConfigSchemaSourcePaths(packageSources)
    ]);
  });

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
    expect(countDescriptions(schema)).toBe(1407);
    // Examples are the documented product content the schema, docs and editor hovers all render.
    const descriptions = JSON.stringify(schema);
    expect(descriptions.split('**Example (YAML):**').length - 1).toBeGreaterThan(900);
    expect(descriptions.split('**Example (TypeScript):**').length - 1).toBeGreaterThan(900);
  });
  test('retained internal declarations do not redefine package-owned names', () => {
    const packageNames = readPackageExportNames();
    const cliGlobals = readCliGlobalDeclarationNames();
    const redefined = [...cliGlobals]
      .filter(([name]) => packageNames.has(name))
      .map(([name, files]) => `${files.join(', ')}: ${name}`)
      .sort();

    // A top-level file and a nested file pin both declaration shapes and recursive discovery.
    expect(cliGlobals.get('StacktapeArgs')).toContain('args.d.ts');
    expect(cliGlobals.get('StpBucket')).toContain(join('stacktape-config', 'buckets.d.ts'));
    expect(() => readCliGlobalDeclarationNames(join(process.cwd(), 'types', 'does-not-exist'))).toThrow(
      'No .d.ts files found'
    );
    expect(redefined).toEqual([]);
  }, 30_000);

  test('the declaration scan ignores module-local helpers', () => {
    const sourceFile = ts.createSourceFile(
      'module.d.ts',
      'export {}; type ModuleLocal = string; declare global { type PublishedGlobal = string; }',
      ts.ScriptTarget.Latest,
      true
    );

    expect(readGlobalDeclarationNames(sourceFile)).toEqual(['PublishedGlobal']);
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
