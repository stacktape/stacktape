import { afterEach, describe, expect, test } from 'bun:test';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import * as ts from 'typescript';
import { CONFIG_PACKAGE_SRC_PATH } from 'src/config/project-paths';
import { buildIndexNamespaceModule, buildResourceModule, resourceModuleName } from './generate-cloudform';

const ROOT_HELPERS = ['resource.ts', 'dataTypes.ts'];
const tempDirs: string[] = [];

/**
 * Generated resource modules import `../resource` and `../dataTypes`, so they are only meaningfully valid
 * when compiled next to the real root helpers. This checks the emitted module the way the committed tree
 * is checked: a full program, semantic diagnostics included.
 */
const compileWithRootHelpers = (modules: Record<string, string>): string[] => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-cloudform-'));
  tempDirs.push(root);
  const namespaceDir = join(root, 'namespace');
  mkdirSync(namespaceDir);
  for (const helper of ROOT_HELPERS) {
    copyFileSync(join(import.meta.dir, 'cloudform-root-helpers', helper), join(root, helper));
  }

  const modulePaths = Object.entries(modules).map(([name, contents]) => {
    const modulePath = join(namespaceDir, `${name}.ts`);
    writeFileSync(modulePath, contents);
    return modulePath;
  });

  const program = ts.createProgram(modulePaths, {
    noEmit: true,
    strict: false,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: false,
    types: [],
    // The root helpers import the authored CloudFormation vocabulary from @stacktape/config. The temp
    // directory has no node_modules, so the package is mapped straight to its source.
    baseUrl: root,
    paths: { '@stacktape/config/*': [join(CONFIG_PACKAGE_SRC_PATH, '*')] }
  });

  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
    if (!diagnostic.file || diagnostic.start === undefined) return message;

    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${relative(root, diagnostic.file.fileName)}:${line + 1}:${character + 1} - ${message}`;
  });
};

const requiredValue = { PrimitiveType: 'String', Required: true };
const tagList = { Type: 'List', ItemType: 'Tag', Required: false };

const valueCollisionModule = buildResourceModule(
  'Connect',
  'DataTableRecord',
  { InstanceArn: requiredValue },
  {
    'AWS::Connect::DataTableRecord.Value': {
      Properties: { AttributeValue: { PrimitiveType: 'String', Required: false } }
    },
    'AWS::Connect::DataTableRecord.Fields': {
      Properties: { Values: { Type: 'List', ItemType: 'Value', Required: true } }
    }
  }
);
const listCollisionModule = buildResourceModule('FraudDetector', 'List', { Name: requiredValue, Tags: tagList }, {});
const resourceTagCollisionModule = buildResourceModule(
  'Budgets',
  'Budget',
  { Tags: tagList },
  { 'AWS::Budgets::Budget.ResourceTag': { Properties: { Key: requiredValue } } }
);
const ordinaryResourceModule = buildResourceModule(
  'Lambda',
  'Permission',
  { FunctionName: requiredValue, Tags: tagList },
  {}
);
const preferredAliasCollisionModule = buildResourceModule(
  'Synthetic',
  'Collision',
  { Name: requiredValue },
  {
    'AWS::Synthetic::Collision.Value': { Properties: { Name: requiredValue } },
    'AWS::Synthetic::Collision.CfnValue': { Properties: { Name: requiredValue } }
  }
);
const indexResourceModule = buildResourceModule('Kendra', 'Index', { Name: requiredValue }, {});
const dataSourceResourceModule = buildResourceModule('Kendra', 'DataSource', { Name: requiredValue }, {});
const indexNamespaceModule = buildIndexNamespaceModule('Kendra', ['DataSource', 'Index']);

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('cloudform resource modules compile when a generated name shadows a root helper', () => {
  test('all representative generated modules form one valid TypeScript program', () => {
    expect(
      compileWithRootHelpers({
        valueCollision: valueCollisionModule,
        listCollision: listCollisionModule,
        resourceTagCollision: resourceTagCollisionModule,
        ordinaryResource: ordinaryResourceModule,
        preferredAliasCollision: preferredAliasCollisionModule,
        indexResource: indexResourceModule,
        dataSource: dataSourceResourceModule,
        'index.namespace': indexNamespaceModule
      })
    ).toEqual([]);
  }, 30_000);

  test('a property type named Value keeps its class and aliases the helper import', () => {
    // AWS::Connect::DataTableRecord.Value
    expect(valueCollisionModule).toContain("import { Value as CfnValue, List } from '../dataTypes'");
    expect(valueCollisionModule).toContain('export class Value {');
    expect(valueCollisionModule).toContain('AttributeValue?: CfnValue<string>');
    expect(valueCollisionModule).toContain('Values!: List<Value>');
  });

  test('a resource named List keeps its class name and aliases the helper import', () => {
    // AWS::FraudDetector::List
    expect(listCollisionModule).toContain("import { Value, List as CfnList } from '../dataTypes'");
    expect(listCollisionModule).toContain('export default class List extends ResourceBase<ListProperties>');
    expect(listCollisionModule).toContain('Tags?: CfnList<ResourceTag>');
  });

  test('a property type named ResourceTag keeps its class name and aliases the helper import', () => {
    // AWS::Budgets::Budget.ResourceTag
    expect(resourceTagCollisionModule).toContain(
      "import {ResourceBase, ResourceTag as CfnResourceTag} from '../resource'"
    );
    expect(resourceTagCollisionModule).toContain('export class ResourceTag {');
    expect(resourceTagCollisionModule).toContain('Tags?: List<CfnResourceTag>');
  });

  test('an ordinary resource is emitted without aliases', () => {
    expect(ordinaryResourceModule).toContain("import {ResourceBase, ResourceTag} from '../resource'");
    expect(ordinaryResourceModule).toContain("import { Value, List } from '../dataTypes'");
    expect(ordinaryResourceModule).toContain('FunctionName: Value<string>');
    expect(ordinaryResourceModule).toContain('Tags?: List<ResourceTag>');
    expect(ordinaryResourceModule).not.toContain('Cfn');
  });

  test('allocates a unique alias when a generated type already uses the preferred helper alias', () => {
    expect(preferredAliasCollisionModule).toContain("import { Value as CfnValue2, List } from '../dataTypes'");
    expect(preferredAliasCollisionModule).toContain('export class Value {');
    expect(preferredAliasCollisionModule).toContain('export class CfnValue {');
  });
});

describe('cloudform namespace modules do not collide with a resource named Index', () => {
  test('an Index resource gets its own module instead of overwriting the namespace re-export', () => {
    expect(resourceModuleName('Index')).toBe('indexResource');
    expect(resourceModuleName('DataSource')).toBe('dataSource');
    expect(resourceModuleName('Faq')).toBe('faq');
  });

  test('the namespace module imports the Index resource as a class it can use as a type', () => {
    // AWS::Kendra::Index, plus the four sibling Index resources in other namespaces.
    expect(indexNamespaceModule).toContain("import Index_ from './indexResource'");
    expect(indexNamespaceModule).toContain('export type Index = Index_');
  });

  test('fails instead of overwriting when two resources map to the same module name', () => {
    expect(() => buildIndexNamespaceModule('Synthetic', ['Index', 'IndexResource'])).toThrow(
      'CloudFormation resources Index and IndexResource both map to module indexResource.'
    );
  });
});
