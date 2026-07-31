import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  compileDeclarations,
  createDeclarationProgram,
  extractReferenceableParamsDeclaration,
  NPM_DECLARATION_FILE_NAMES,
  NPM_SOURCE_FILES
} from './build-npm-main-export';

/**
 * The declaration half of `build:npm:main`, which needs no bundler and therefore runs on every platform.
 *
 * This exists because the gate that fails when the published declarations do not compile was itself compiling
 * them under a hand-written approximation of the CLI project: hard-coded `ES2020` (so `String.replaceAll` was
 * an error against the CLI's real `ES2023` lib) and without the CLI's path mappings. The published sources now
 * use explicit imports, so this test verifies the real project options without recreating an ambient-type environment.
 */
// Building the CLI program is the expensive part, so both are computed once for the whole file.
const declarationProgram = createDeclarationProgram();
const declarations = compileDeclarations();

describe('the npm declaration program is the CLI project', () => {
  test('publishes the four files consumed by Console Monaco', () => {
    expect(NPM_DECLARATION_FILE_NAMES).toEqual(['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts']);
  });

  test('exports every advertised declaration subpath from the npm package', () => {
    const packageJson = JSON.parse(
      readFileSync(join(import.meta.dir, 'release', 'npm-package', 'package.json'), 'utf8')
    ) as { exports: Record<string, { types?: string }> };

    expect(packageJson.exports['./plain']?.types).toBe('./plain.d.ts');
  });

  test('inherits the real target/lib and path mappings rather than a second copy', () => {
    const options = declarationProgram.program.getCompilerOptions();

    // The CLI compiles against ES2023; a lower lib silently loses String.replaceAll and friends.
    expect(options.lib).toContain('lib.es2023.d.ts');
    expect(options.paths?.['@scripts/*']).toBeDefined();
    expect(options.paths?.['@cloudform/*']).toBeDefined();
    // Only emit is overridden.
    expect(options.declaration).toBe(true);
    expect(options.emitDeclarationOnly).toBe(true);
    expect(options.noEmit).toBe(false);
  });

  test('uses only the published entry sources as roots', () => {
    expect([...declarationProgram.program.getRootFileNames()].sort()).toEqual([...NPM_SOURCE_FILES].sort());
  });

  test('compiles with no repository-owned source diagnostics and emits one declaration per npm source', () => {
    // compileDeclarations throws on any repository-owned `.ts` diagnostic, on emitSkipped, and on a short map.
    // The emitted artifact is covered separately by the consumer check, which compiles it with `skipLibCheck` off.
    expect([...declarations.keys()].sort()).toEqual(NPM_SOURCE_FILES.map((file) => basename(file, '.ts')).sort());
    for (const [name, contents] of declarations) {
      expect(contents.length, `${name}.d.ts should not be empty`).toBeGreaterThan(0);
    }
  });

  test('emits the declarations the published entry points are assembled from', () => {
    expect(declarations.get('config')).toContain('defineConfig');
    expect(declarations.get('resources')).toContain('LambdaFunction');
    expect(declarations.get('directives')).toContain('$Secret');
  });

  test('publishes referenceable parameters without leaking generator metadata', () => {
    const publishedMetadata = extractReferenceableParamsDeclaration(declarations.get('resource-metadata') || '');

    expect(publishedMetadata).toContain('REFERENCEABLE_PARAMS');
    expect(publishedMetadata).not.toContain('ResourceDefinition');
    expect(publishedMetadata).not.toContain('getResourcesWithOverrides');
  });

  test('emit stays scoped to the npm sources', () => {
    // Dependencies loaded to type-check the entry points must not become published output.
    expect(declarations.size).toBe(NPM_SOURCE_FILES.length);
    expect([...declarations.keys()]).not.toContain('random');
    expect([...declarations.keys()]).not.toContain('logical-names');
  });
});
