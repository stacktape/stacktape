import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { NPM_RELEASE_FOLDER_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import * as ts from 'typescript';

/**
 * Compiles a real consumer against a built `stacktape` package, the way a customer's project does.
 *
 * The npm build emits `index.d.ts`, `types.d.ts`, `cloudformation.d.ts` and `plain.d.ts`. Nothing checked that
 * the names those files export actually resolve, so aliases pointing at types that were never generated —
 * `plain.BudgetControl`, the Convex override and transform types — shipped broken. This is a no-emit program
 * with `skipLibCheck` off, so a dangling published name is an error rather than a silent `any`.
 *
 * The package directory is always explicit. Verifying "whatever is in `__release-npm`" would happily pass
 * against a stale directory from an unrelated build, which is exactly what this is supposed to prevent.
 */
const REQUIRED_DECLARATIONS = ['index.d.ts', 'types.d.ts', 'cloudformation.d.ts', 'plain.d.ts'];

/** Exported names a customer is entitled to import; every one of these has shipped in a published release. */
const consumerFixtureFor = (packageDir: string) => {
  const entry = (name: string) => join(packageDir, name).split('\\').join('/');
  return `
import { LambdaFunction, WebService, Bucket, Convex, IotIntegration, defineConfig, $Secret } from '${entry('index')}';
import type { CloudFormationTemplate, FinalTransform } from '${entry('index')}';
import type { StacktapeConfig, StacktapeBudgetControlPlain, IotIntegrationProps } from '${entry('types')}';
// @ts-expect-error v4 TypeScript configs no longer expose the legacy named getConfig function type
import type { GetConfigFunction } from '${entry('types')}';
import type { CloudFormationResource } from '${entry('cloudformation')}';

const api = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } }
});
const site = new WebService({
  packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
  resources: { cpu: 0.25, memory: 512 }
});
const uploads = new Bucket({ versioning: true });
// @ts-expect-error resource names come from their key in the resources object
new Bucket('legacy-explicit-name', { versioning: true });
// @ts-expect-error resource constructors are source-typed rather than accepting arbitrary bags
new Bucket({ propertyThatDoesNotExist: true });
// Convex has no modelled CloudFormation children, so its constructor takes the ordinary authored props.
const backend = new Convex({ appDirectory: './convex' });

// The IoT integration class and its props type have to agree. The class used to take an untyped bag while the
// published type described { sql, sqlVersion? }, so nothing noticed that the two had drifted apart.
const iotProperties: IotIntegrationProps = { sql: "SELECT * FROM 'devices/+/telemetry'", sqlVersion: '2016-03-23' };
const iotTrigger = new IotIntegration(iotProperties);
const minimalIotTrigger = new IotIntegration({ sql: "SELECT * FROM 'devices/#'" });
const template: CloudFormationTemplate = { Resources: {} };
const finalTransform: FinalTransform = (value) => value;

export const config = defineConfig(() => ({
  projectName: 'consumer-fixture',
  resources: { api, site, uploads, backend },
  variables: { secret: $Secret('db-password'), iot: iotTrigger.type, minimalIot: minimalIotTrigger.type },
  finalTransform
}));
export const compiledConfig = config({
  stage: 'test',
  region: 'eu-west-1',
  cliArgs: {},
  command: 'synth',
  awsProfile: ''
});
export const compiledResources = compiledConfig.config.resources;

export type EveryPublishedNameResolves = [
  StacktapeConfig,
  StacktapeBudgetControlPlain,
  IotIntegrationProps,
  CloudFormationResource,
  typeof template
];
`;
};

/** Whether `child` is `parent` or lives underneath it, compared as normalized absolute paths. */
const isInside = (parent: string, child: string) => {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};

/**
 * Whether a diagnostic is one this gate is responsible for.
 *
 * Containment, not a substring match on `node_modules`. `verify-release-artifact` verifies the package after
 * `npm install`, so the directory under test is itself `<fixture>/node_modules/stacktape`: a `node_modules`
 * substring filter silently discarded every diagnostic in the published declarations, which is exactly what
 * this gate exists to report.
 */
export const isVerifiedDiagnostic = (diagnostic: ts.Diagnostic, packageDir: string): boolean => {
  // A diagnostic with no file is a program-level failure; it is never someone else's problem.
  if (!diagnostic.file) return true;
  // The declarations under test, wherever they happen to be installed.
  if (isInside(packageDir, diagnostic.file.fileName)) return true;
  // Unrelated third-party packages the consumer fixture happened to pull in.
  if (diagnostic.file.fileName.includes('node_modules')) return false;
  // The consumer fixture itself, and anything else in the repository.
  return true;
};

export const verifyNpmDeclarations = ({ packageDir }: { packageDir: string }) => {
  if (!isAbsolute(packageDir)) {
    throw new Error(`verifyNpmDeclarations needs an absolute package directory, got "${packageDir}".`);
  }

  const missing = REQUIRED_DECLARATIONS.filter((file) => !existsSync(join(packageDir, file)));
  if (missing.length > 0) {
    throw new Error(
      `Cannot verify published declarations: ${missing.join(', ')} missing from ${packageDir}. ` +
        'Build the package first (`bun run build:npm:main`; Linux or macOS, the Bun bundler aborts on Windows).'
    );
  }

  const workspace = mkdtempSync(join(tmpdir(), 'stacktape-npm-consumer-'));
  try {
    const fixturePath = join(workspace, 'consumer.ts');
    writeFileSync(fixturePath, consumerFixtureFor(packageDir), 'utf-8');

    const program = ts.createProgram([fixturePath], {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: []
    });

    const errors = ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => isVerifiedDiagnostic(diagnostic, packageDir))
      .map(
        (diagnostic) =>
          `${diagnostic.file?.fileName ?? '<program>'}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
      );

    if (errors.length > 0) {
      throw new Error(
        `The published declarations in ${packageDir} do not typecheck for a consumer:\n${errors.slice(0, 25).join('\n')}`
      );
    }
    logSuccess(`A strict consumer compiles against ${packageDir}.`);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  const [explicitDir] = process.argv.slice(2);
  const packageDir = explicitDir
    ? isAbsolute(explicitDir)
      ? explicitDir
      : join(process.cwd(), explicitDir)
    : NPM_RELEASE_FOLDER_PATH;
  logInfo(`Verifying the published stacktape declarations in ${packageDir}...`);
  verifyNpmDeclarations({ packageDir });
}
