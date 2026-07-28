import { afterEach, describe, expect, test } from 'bun:test';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
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
    types: []
  });

  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
};

const requiredValue = { PrimitiveType: 'String', Required: true };
const tagList = { Type: 'List', ItemType: 'Tag', Required: false };

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('cloudform resource modules compile when a generated name shadows a root helper', () => {
  test('a property type named Value keeps its class and aliases the helper import', () => {
    // AWS::Connect::DataTableRecord.Value
    const generated = buildResourceModule(
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

    expect(compileWithRootHelpers({ dataTableRecord: generated })).toEqual([]);
    expect(generated).toContain("import { Value as CfnValue, List } from '../dataTypes'");
    expect(generated).toContain('export class Value {');
    expect(generated).toContain('AttributeValue?: CfnValue<string>');
    expect(generated).toContain('Values!: List<Value>');
  });

  test('a resource named List keeps its class name and aliases the helper import', () => {
    // AWS::FraudDetector::List
    const generated = buildResourceModule('FraudDetector', 'List', { Name: requiredValue, Tags: tagList }, {});

    expect(compileWithRootHelpers({ list: generated })).toEqual([]);
    expect(generated).toContain("import { Value, List as CfnList } from '../dataTypes'");
    expect(generated).toContain('export default class List extends ResourceBase<ListProperties>');
    expect(generated).toContain('Tags?: CfnList<ResourceTag>');
  });

  test('a property type named ResourceTag keeps its class name and aliases the helper import', () => {
    // AWS::Budgets::Budget.ResourceTag
    const generated = buildResourceModule(
      'Budgets',
      'Budget',
      { Tags: tagList },
      { 'AWS::Budgets::Budget.ResourceTag': { Properties: { Key: requiredValue } } }
    );

    expect(compileWithRootHelpers({ budget: generated })).toEqual([]);
    expect(generated).toContain("import {ResourceBase, ResourceTag as CfnResourceTag} from '../resource'");
    expect(generated).toContain('export class ResourceTag {');
    expect(generated).toContain('Tags?: List<CfnResourceTag>');
  });

  test('an ordinary resource is emitted without aliases', () => {
    const generated = buildResourceModule('Lambda', 'Permission', { FunctionName: requiredValue, Tags: tagList }, {});

    expect(compileWithRootHelpers({ permission: generated })).toEqual([]);
    expect(generated).toContain("import {ResourceBase, ResourceTag} from '../resource'");
    expect(generated).toContain("import { Value, List } from '../dataTypes'");
    expect(generated).toContain('FunctionName: Value<string>');
    expect(generated).toContain('Tags?: List<ResourceTag>');
    expect(generated).not.toContain('Cfn');
  });

  test('allocates a unique alias when a generated type already uses the preferred helper alias', () => {
    const generated = buildResourceModule(
      'Synthetic',
      'Collision',
      { Name: requiredValue },
      {
        'AWS::Synthetic::Collision.Value': { Properties: { Name: requiredValue } },
        'AWS::Synthetic::Collision.CfnValue': { Properties: { Name: requiredValue } }
      }
    );

    expect(compileWithRootHelpers({ collision: generated })).toEqual([]);
    expect(generated).toContain("import { Value as CfnValue2, List } from '../dataTypes'");
    expect(generated).toContain('export class Value {');
    expect(generated).toContain('export class CfnValue {');
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
    const indexResource = buildResourceModule('Kendra', 'Index', { Name: requiredValue }, {});
    const namespaceModule = buildIndexNamespaceModule('Kendra', ['DataSource', 'Index']);
    const dataSourceResource = buildResourceModule('Kendra', 'DataSource', { Name: requiredValue }, {});

    expect(namespaceModule).toContain("import Index_ from './indexResource'");
    expect(namespaceModule).toContain('export type Index = Index_');
    expect(
      compileWithRootHelpers({
        indexResource,
        dataSource: dataSourceResource,
        'index.namespace': namespaceModule
      })
    ).toEqual([]);
  });

  test('fails instead of overwriting when two resources map to the same module name', () => {
    expect(() => buildIndexNamespaceModule('Synthetic', ['Index', 'IndexResource'])).toThrow(
      'CloudFormation resources Index and IndexResource both map to module indexResource.'
    );
  });
});
