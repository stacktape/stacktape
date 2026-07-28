import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import { measureBridgeUsage, readRetainedAmbientNames } from './check-config-bridge';
import {
  buildConfigBridge,
  publicSpecifierFor,
  readPackageDeclarations,
  readPackageSpecifiers
} from './generate-config-bridge';

const tempDirs: string[] = [];

const MANIFEST = {
  name: '@stacktape/config',
  exports: { '.': './src/config.ts', './shared': './src/shared.ts', './*': './src/*.ts' }
};

/** A package laid out the way the real one is: a manifest beside a `src` directory of modules. */
const writePackage = (modules: Record<string, string>, manifest: unknown = MANIFEST): string => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-bridge-'));
  tempDirs.push(root);
  const src = join(root, 'src');
  mkdirSync(src);
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  for (const [name, contents] of Object.entries(modules)) {
    writeFileSync(join(src, name), contents, 'utf-8');
  }
  return src;
};

/** Builds a tiny program in which `bridge.d.ts` plays the role of the generated ambient bridge. */
const measureAgainstBridge = (bridge: string, consumers: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-bridge-usage-'));
  tempDirs.push(root);
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'types'));
  const bridgePath = join(root, 'bridge.d.ts');
  writeFileSync(bridgePath, bridge, 'utf-8');
  const files = [bridgePath];
  for (const [name, contents] of Object.entries(consumers)) {
    const path = join(root, name.endsWith('.d.ts') ? 'types' : 'src', name);
    writeFileSync(path, contents, 'utf-8');
    files.push(path);
  }
  const program = ts.createProgram(files, {
    noEmit: true,
    strict: false,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: []
  });
  return measureBridgeUsage(program, bridgePath, root);
};

afterEach(() => {
  for (const directory of tempDirs) rmSync(directory, { recursive: true, force: true });
  tempDirs.length = 0;
});

describe('bridge specifiers come from the package manifest', () => {
  test('the root, named and wildcard subpaths are read from the export map', () => {
    const specifiers = readPackageSpecifiers(writePackage({ 'config.ts': 'export type A = 1;' }));

    expect(specifiers.name).toBe('@stacktape/config');
    expect(publicSpecifierFor('config', specifiers)).toBe('@stacktape/config');
    expect(publicSpecifierFor('shared', specifiers)).toBe('@stacktape/config/shared');
    expect(publicSpecifierFor('buckets', specifiers)).toBe('@stacktape/config/buckets');
  });

  test('a module the manifest cannot publish is an error, not a guess', () => {
    const src = writePackage(
      { 'config.ts': 'export type A = 1;' },
      {
        name: '@stacktape/config',
        exports: { '.': './src/config.ts' }
      }
    );
    const specifiers = readPackageSpecifiers(src);

    expect(() => publicSpecifierFor('buckets', specifiers)).toThrow('publishes no subpath');
  });

  test('a manifest without a name or export map is rejected', () => {
    expect(() => readPackageSpecifiers(writePackage({ 'config.ts': 'export type A = 1;' }, { name: 'x' }))).toThrow(
      'no name or exports map'
    );
    expect(() =>
      readPackageSpecifiers(
        writePackage({ 'config.ts': 'export type A = 1;' }, { name: 'x', exports: { './a': './src/a.ts' } })
      )
    ).toThrow('no "." export');
  });
});

describe('bridge generation reads each module export table', () => {
  test('sees declarations exported inline, exported separately, and re-exported', () => {
    const src = writePackage({
      'config.ts': 'export type StacktapeConfig = { resources: Record<string, unknown> };',
      'buckets.ts': [
        'export interface Bucket {',
        '  name: string;',
        '}',
        'export declare type BucketName = string;',
        'export enum BucketAcl {',
        "  Private = 'private'",
        '}',
        // Declared locally, exported afterwards: invisible to a statement scan.
        'interface BucketPolicy { statements: string[] }',
        'export { BucketPolicy };',
        'type NotExported = never;',
        'export const RUNTIME_ONLY = 1;'
      ].join('\n'),
      // A type re-exported from another module still belongs to this module's public surface.
      'shared.ts': "export type { BucketName as SharedBucketName } from './buckets';"
    });

    const declarations = readPackageDeclarations(src);

    expect(declarations.map(({ name }) => name)).toEqual([
      'Bucket',
      'BucketAcl',
      'BucketName',
      'BucketPolicy',
      'SharedBucketName',
      'StacktapeConfig'
    ]);
    expect(declarations.find(({ name }) => name === 'SharedBucketName')?.specifier).toBe('@stacktape/config/shared');
    expect(declarations.map(({ name }) => name)).not.toContain('RUNTIME_ONLY');
    expect(declarations.map(({ name }) => name)).not.toContain('NotExported');
  });

  test('a default export is not bridged, because there is no name to alias', () => {
    const src = writePackage({
      'config.ts': 'export type StacktapeConfig = 1;',
      'legacy.ts': 'export default class Legacy {}'
    });

    expect(readPackageDeclarations(src).map(({ name }) => name)).toEqual(['StacktapeConfig']);
  });

  test('fails instead of emitting an empty bridge', () => {
    expect(() => readPackageDeclarations(writePackage({}))).toThrow('No @stacktape/config modules');
    expect(() => readPackageDeclarations(writePackage({ 'config.ts': 'export const ONLY_A_VALUE = 1;' }))).toThrow(
      'No exported type declarations'
    );
  });

  test('fails when two modules export the same name', () => {
    const src = writePackage({
      'config.ts': 'export type StacktapeConfig = 1;',
      'buckets.ts': 'export type Shared = 1;',
      'queues.ts': 'export interface Shared { a: string }'
    });
    expect(() => readPackageDeclarations(src)).toThrow('exports the same name from more than one module');
  });

  test('each alias imports through the manifest specifier', () => {
    const bridge = buildConfigBridge([
      { name: 'StacktapeConfig', specifier: '@stacktape/config' },
      { name: 'Bucket', specifier: '@stacktape/config/buckets' }
    ]);
    expect(bridge).toContain("type StacktapeConfig = import('@stacktape/config').StacktapeConfig;");
    expect(bridge).toContain("type Bucket = import('@stacktape/config/buckets').Bucket;");
  });
});

describe('bridge usage is measured by symbol resolution', () => {
  const bridge = ['type Bucket = { name: string };', 'type WebService = { url: string };'].join('\n');

  test('counts a file that resolves a bridged name', () => {
    const usage = measureAgainstBridge(bridge, { 'uses.ts': 'export const b: Bucket = { name: "x" };' });
    expect([...usage.filesByCluster.values()].flat()).toHaveLength(1);
    expect([...usage.referencedNames]).toEqual(['Bucket']);
  });

  test('counts a repository declaration file, not only sources', () => {
    // `types/**` is full of resolved-model declarations written against the configuration types. Skipping
    // them reported "delete the bridge" while dozens of `.d.ts` consumers still resolved its symbols.
    const usage = measureAgainstBridge(bridge, {
      'resolved.d.ts': 'declare type StpBucket = Bucket & { cfLogicalName: string };'
    });

    expect(usage.filesByCluster.get('types')).toEqual([join('types', 'resolved.d.ts')]);
    expect([...usage.referencedNames]).toEqual(['Bucket']);
  });

  test('ignores the name in comments and string literals', () => {
    const usage = measureAgainstBridge(bridge, {
      'prose.ts': ['// Bucket is mentioned here', '/* and Bucket here */', 'export const s = "Bucket";'].join('\n')
    });
    expect([...usage.filesByCluster.values()].flat()).toBeEmpty();
    expect(usage.referencedNames.size).toBe(0);
  });

  test('ignores a local declaration that shadows a bridged name', () => {
    const usage = measureAgainstBridge(bridge, {
      'shadow.ts': ['type Bucket = { local: true };', 'export const b: Bucket = { local: true };'].join('\n')
    });
    expect([...usage.filesByCluster.values()].flat()).toBeEmpty();
  });

  test('still counts a file that imports one config type but leaves another global', () => {
    // The previous checker skipped such a file wholesale; resource-references.ts is the real instance.
    const usage = measureAgainstBridge(bridge, {
      'partial.ts': [
        'import type { WebService } from "./local-web-service";',
        'export const w: WebService = { url: "x" };',
        'export const b: Bucket = { name: "x" };'
      ].join('\n'),
      'local-web-service.ts': 'export type WebService = { url: string };'
    });
    expect([...usage.filesByCluster.values()].flat()).toContain(join('src', 'partial.ts'));
    expect([...usage.referencedNames]).toEqual(['Bucket']);
  });

  test('a bridge nobody resolves reports zero, which is the deletion condition', () => {
    const usage = measureAgainstBridge(bridge, {
      'unrelated.ts': 'export const n = 1;',
      'unrelated.d.ts': 'declare type Unrelated = string;'
    });
    expect([...usage.filesByCluster.values()].flat()).toBeEmpty();
    expect(usage.referencedNames.size).toBe(0);
  });
});

describe('retained ambient declarations are read as syntax', () => {
  test('sees declare, interface, class and enum forms', () => {
    const src = writePackage({
      'config.ts': 'export type StacktapeConfig = 1;',
      'retained.d.ts': [
        'declare interface RetainedInterface { a: string }',
        'declare type RetainedAlias = string;',
        'declare class RetainedClass {}',
        'declare enum RetainedEnum { A }',
        'declare const retainedValue: number;'
      ].join('\n')
    });

    const declared = readRetainedAmbientNames(src);

    expect([...declared.keys()].sort()).toEqual([
      'RetainedAlias',
      'RetainedClass',
      'RetainedEnum',
      'RetainedInterface',
      'StacktapeConfig'
    ]);
    expect(declared.get('RetainedInterface')).toEqual(['retained.d.ts']);
  });
});
