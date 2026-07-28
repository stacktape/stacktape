import { describe, expect, test } from 'bun:test';
import { basename } from 'node:path';
import { compileDeclarations, createDeclarationProgram, NPM_SOURCE_FILES } from './build-npm-main-export';

/**
 * The declaration half of `build:npm:main`, which needs no bundler and therefore runs on every platform.
 *
 * This exists because the gate that fails when the published declarations do not compile was itself compiling
 * them under a hand-written approximation of the CLI project: hard-coded `ES2020` (so `String.replaceAll` was
 * an error against the CLI's real `ES2023` lib) and only the npm sources as roots (so every ambient name they
 * are written against — `StacktapeConfig`, `StpResourceType`, `HttpMethod` — was unresolved). Both produced a
 * red gate on Linux while the sources themselves were fine.
 */
// Building the CLI program is the expensive part, so both are computed once for the whole file.
const declarationProgram = createDeclarationProgram();
const declarations = compileDeclarations();

describe('the npm declaration program is the CLI project', () => {
  test('inherits the real target/lib and path mappings rather than a second copy', () => {
    const options = declarationProgram.program.getCompilerOptions();

    // The CLI compiles against ES2023; a lower lib silently loses String.replaceAll and friends.
    expect(options.lib).toContain('lib.es2023.d.ts');
    expect(options.paths?.['@shared/*']).toBeDefined();
    expect(options.paths?.['@cloudform/*']).toBeDefined();
    // Only emit is overridden.
    expect(options.declaration).toBe(true);
    expect(options.emitDeclarationOnly).toBe(true);
    expect(options.noEmit).toBe(false);
  });

  test('includes the ambient declaration roots the npm sources are typed against', () => {
    const roots = declarationProgram.program.getRootFileNames().map((file) => file.split(/[/\\]/).slice(-2).join('/'));

    expect(roots.some((file) => file.endsWith('types/random.d.ts'))).toBe(true);
    expect(roots.some((file) => file.endsWith('config-package-bridge.generated.d.ts'))).toBe(true);
  });

  test('compiles with no repository-owned source diagnostics and emits one declaration per npm source', () => {
    // compileDeclarations throws on any repository-owned `.ts` diagnostic, on emitSkipped, and on a short map.
    // Declaration files are not checked: the project inherits the CLI's `skipLibCheck: true`. The emitted
    // artifact is covered separately by the consumer check, which compiles it with `skipLibCheck` off.
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

  test('emit stays scoped to the npm sources', () => {
    // The ambient roots and everything the program loads to type-check must not become published output.
    expect(declarations.size).toBe(NPM_SOURCE_FILES.length);
    expect([...declarations.keys()]).not.toContain('random');
    expect([...declarations.keys()]).not.toContain('logical-names');
  });
});
