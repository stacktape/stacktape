import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import { isVerifiedDiagnostic, verifyNpmDeclarations } from './verify-npm-declarations';

const tempDirs: string[] = [];

/** Present in every fixture: the variants differ only in whether `BudgetControl` resolves. */
const IOT_PROPS = 'export type IotIntegrationProps = { sql: string; sqlVersion?: string };\n';

/**
 * A minimal `stacktape` package installed exactly where the release gate finds one: under `node_modules`.
 *
 * `verify-release-artifact` packs the artifact, installs the tarball and verifies the installed copy, so the
 * directory under test is itself `<fixture>/node_modules/stacktape`. Filtering diagnostics by a `node_modules`
 * substring therefore discarded every diagnostic in the published declarations — the gate reported success on
 * a package whose types did not resolve.
 */
const installMinimalPackage = ({ plainDeclarations }: { plainDeclarations: string }): string => {
  const fixture = mkdtempSync(join(tmpdir(), 'stacktape-installed-'));
  tempDirs.push(fixture);
  const packageDir = join(fixture, 'node_modules', 'stacktape');
  mkdirSync(packageDir, { recursive: true });

  writeFileSync(
    join(packageDir, 'index.d.ts'),
    [
      'export declare class LambdaFunction { constructor(properties: Record<string, unknown>); }',
      'export declare class WebService { constructor(properties: Record<string, unknown>); }',
      'export declare class Bucket { constructor(properties: Record<string, unknown>); }',
      'export declare class Convex { constructor(properties: Record<string, unknown>); }',
      // Typed exactly as the real generator emits it, so the fixture exercises the class/type pair together.
      "export declare class IotIntegration { constructor(properties: import('./plain').IotIntegrationProps); readonly type: 'iot'; }",
      'export declare function defineConfig<T>(factory: () => T): T;',
      'export declare function $Secret(name: string): string;'
    ].join('\n'),
    'utf-8'
  );
  writeFileSync(
    join(packageDir, 'types.d.ts'),
    [
      'export type StacktapeConfig = {',
      '  projectName?: string;',
      '  resources?: Record<string, unknown>;',
      '  variables?: Record<string, unknown>;',
      '};',
      "export type StacktapeBudgetControlPlain = import('./plain').BudgetControl;",
      "export type IotIntegrationProps = import('./plain').IotIntegrationProps;"
    ].join('\n'),
    'utf-8'
  );
  writeFileSync(
    join(packageDir, 'cloudformation.d.ts'),
    'export type CloudFormationResource = { Type: string };\n',
    'utf-8'
  );
  writeFileSync(join(packageDir, 'plain.d.ts'), plainDeclarations, 'utf-8');

  return packageDir;
};

afterEach(() => {
  for (const directory of tempDirs) rmSync(directory, { recursive: true, force: true });
  tempDirs.length = 0;
});

describe('the published declarations are verified where they are actually installed', () => {
  test('a package under node_modules whose published alias dangles is rejected', () => {
    // `types.d.ts` aliases `./plain.BudgetControl`, and plain.d.ts does not declare it — the exact shape of the
    // bug that shipped. Every required declaration filename is present, so only type checking can catch it.
    const packageDir = installMinimalPackage({ plainDeclarations: `${IOT_PROPS}export type SomethingElse = 1;\n` });
    let verificationError: Error | undefined;

    try {
      verifyNpmDeclarations({ packageDir });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      verificationError = error as Error;
    }

    expect(verificationError?.message).toContain('do not typecheck for a consumer');
    expect(verificationError?.message).toContain('BudgetControl');
  }, 30_000);

  test('a package under node_modules whose declarations resolve is accepted', () => {
    const packageDir = installMinimalPackage({
      plainDeclarations: `${IOT_PROPS}export type BudgetControl = { limit: number };\n`
    });

    expect(() => verifyNpmDeclarations({ packageDir })).not.toThrow();
  }, 30_000);

  test('missing declaration files fail closed rather than passing vacuously', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'stacktape-installed-'));
    tempDirs.push(fixture);
    const packageDir = join(fixture, 'node_modules', 'stacktape');
    mkdirSync(packageDir, { recursive: true });

    expect(() => verifyNpmDeclarations({ packageDir })).toThrow('Cannot verify published declarations');
  });

  test('a relative package directory is refused', () => {
    expect(() => verifyNpmDeclarations({ packageDir: 'node_modules/stacktape' })).toThrow(
      'needs an absolute package directory'
    );
  });
});

describe('diagnostic classification is by containment, not by path substring', () => {
  const packageDir = join(tmpdir(), 'fixture', 'node_modules', 'stacktape');
  const diagnosticIn = (fileName: string) =>
    ({
      file: { fileName } as ts.SourceFile,
      start: 0,
      length: 0,
      messageText: 'x',
      category: ts.DiagnosticCategory.Error,
      code: 2694
    }) as ts.Diagnostic;

  test('a diagnostic with no file is always reported', () => {
    expect(
      isVerifiedDiagnostic(
        { messageText: 'x', category: ts.DiagnosticCategory.Error, code: 1 } as ts.Diagnostic,
        packageDir
      )
    ).toBe(true);
  });

  test('a diagnostic inside the package under test is reported even though the path contains node_modules', () => {
    expect(isVerifiedDiagnostic(diagnosticIn(join(packageDir, 'types.d.ts')), packageDir)).toBe(true);
  });

  test('a diagnostic in an unrelated third-party package is excluded', () => {
    expect(
      isVerifiedDiagnostic(
        diagnosticIn(join(tmpdir(), 'fixture', 'node_modules', 'left-pad', 'index.d.ts')),
        packageDir
      )
    ).toBe(false);
  });

  test('a diagnostic in the consumer fixture or the repository is reported', () => {
    expect(isVerifiedDiagnostic(diagnosticIn(join(tmpdir(), 'consumer', 'consumer.ts')), packageDir)).toBe(true);
    expect(isVerifiedDiagnostic(diagnosticIn(join(process.cwd(), 'src', 'index.ts')), packageDir)).toBe(true);
  });

  test('a sibling directory sharing a name prefix is not treated as inside the package', () => {
    expect(isVerifiedDiagnostic(diagnosticIn(`${packageDir}-other/index.d.ts`), packageDir)).toBe(false);
  });
});
