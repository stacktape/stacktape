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
      'export declare class BaseResource<Type extends string> { private readonly resourceType: Type; }',
      "export declare class LambdaFunction extends BaseResource<'function'> { constructor(properties: { packaging: unknown; connectTo?: Array<string | BaseResource<'bucket' | 'function'>> }); }",
      'export declare class WebService { constructor(properties: Record<string, unknown>); }',
      "export declare class Bucket extends BaseResource<'bucket'> { constructor(properties: { versioning?: boolean }); }",
      "export declare class HttpApiGateway extends BaseResource<'http-api-gateway'> { constructor(properties: Record<string, unknown>); }",
      "export declare class StateMachine extends BaseResource<'state-machine'> { constructor(properties: { definition: unknown; connectTo?: Array<string | BaseResource<'function'>> }); }",
      "export declare class LocalScript { constructor(properties: { executeCommand: string; connectTo?: Array<string | BaseResource<'bucket' | 'function'>> }); }",
      "export declare class HttpApiIntegration { constructor(properties: { httpApiGatewayName: string | BaseResource<'http-api-gateway'>; method: 'GET' | 'POST'; path: string }); readonly type: 'http-api-gateway'; }",
      'export declare class Convex { constructor(properties: Record<string, unknown>); }',
      "export declare class LambdaErrorRateTrigger { constructor(properties: { thresholdPercent: number }); readonly type: 'lambda-error-rate'; readonly properties: { thresholdPercent: number }; }",
      'export declare class Alarm<Trigger extends LambdaErrorRateTrigger> { constructor(properties: { trigger: Trigger; includeInHistory?: boolean; description?: string }); readonly trigger: Trigger; readonly includeInHistory?: boolean; readonly description?: string; }',
      "export declare class LambdaS3FilesMount { constructor(properties: { accessPointArn: string; mountPath: string }); readonly type: 's3files'; readonly properties: { accessPointArn: string; mountPath: string }; }",
      // Typed exactly as the real generator emits it, so the fixture exercises the class/type pair together.
      "export declare class IotIntegration { constructor(properties: import('./plain').IotIntegrationProps); readonly type: 'iot'; readonly properties: import('./plain').IotIntegrationProps; }",
      "export { cfnResource, cfnResourceUnchecked, getAtt, ref, sub } from './cloudformation';",
      "export type { AnyCloudFormationResource, CloudFormationTemplate, Intrinsic } from './cloudformation';",
      "export type FinalTransform = <Template extends import('./cloudformation').CloudFormationTemplate>(template: Template) => Template;",
      'export declare function defineConfig<T>(factory: () => T): (params: Record<string, unknown>) => { config: T };',
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
    [
      "export type Intrinsic = { Ref: string } | { 'Fn::GetAtt': [string, string] } | { 'Fn::Sub': string };",
      'export type CloudFormationValue<T> = T | Intrinsic;',
      "export type CloudFormationResourceProperties = { 'AWS::S3::Bucket': { BucketName?: CloudFormationValue<string> }; 'AWS::CloudFormation::WaitConditionHandle': Record<string, never> };",
      'export type KnownCloudFormationResourceType = keyof CloudFormationResourceProperties;',
      'export type CloudFormationResource<Type extends string = string, Properties extends object = object> = { Type: Type; Properties: Properties };',
      'export type AnyCloudFormationResource = CloudFormationResource | { Type: string };',
      'export type CloudFormationTemplate = { Resources: Record<string, AnyCloudFormationResource>; Metadata?: Record<string, unknown> };',
      'export declare function cfnResource<Type extends KnownCloudFormationResourceType>(type: Type, properties: CloudFormationResourceProperties[Type]): CloudFormationResource<Type, CloudFormationResourceProperties[Type]>;',
      'export declare function cfnResourceUnchecked<Type extends string, Properties extends object>(type: Type, properties: Properties): CloudFormationResource<Type, Properties>;',
      'export declare function ref(logicalName: string): { Ref: string };',
      "export declare function getAtt(logicalName: string, attributeName: string): { 'Fn::GetAtt': [string, string] };",
      "export declare function sub(template: string): { 'Fn::Sub': string };"
    ].join('\n'),
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
