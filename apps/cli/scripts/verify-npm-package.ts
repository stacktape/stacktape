import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NPM_RELEASE_FOLDER_PATH } from 'src/config/project-paths';
import { pnpmPack } from './release/pnpm-pack';
import { verifyNpmDeclarations } from './verify-npm-declarations';

type PackageManifest = {
  name: string;
  version: string;
  main: string;
  types: string;
  exports: Record<string, string | Record<string, string>>;
  bin: Record<string, string>;
  dependencies?: Record<string, string>;
};

const resolvePackagePath = (packageDir: string, relativePath: string) => {
  const resolved = normalize(join(packageDir, relativePath));
  assert.ok(
    resolved.startsWith(`${normalize(packageDir)}\\`) || resolved.startsWith(`${normalize(packageDir)}/`),
    `Package path escapes artifact directory: ${relativePath}`
  );
  return resolved;
};

const getExportPaths = (value: string | Record<string, string>): string[] =>
  typeof value === 'string' ? [value] : Object.values(value);

const assertContains = async (filePath: string, values: string[]) => {
  const content = await readFile(filePath, 'utf8');
  for (const value of values) {
    assert.ok(content.includes(value), `${filePath} must contain ${value}`);
  }
};

export const verifyNpmPackage = async ({
  packageDir = NPM_RELEASE_FOLDER_PATH,
  requireChecksums = false,
  expectedVersion
}: {
  packageDir?: string;
  requireChecksums?: boolean;
  expectedVersion?: string;
} = {}) => {
  assert.ok(isAbsolute(packageDir), 'NPM artifact path must be absolute');
  const manifestPath = join(packageDir, 'package.json');
  assert.ok(existsSync(manifestPath), `NPM artifact is missing: ${manifestPath}`);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest;
  assert.equal(manifest.name, 'stacktape');
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+].+)?$/);
  if (expectedVersion) {
    assert.equal(
      manifest.version,
      expectedVersion,
      'NPM artifact version does not match the requested release version'
    );
  }
  assert.deepEqual(Object.keys(manifest.bin).sort(), ['stacktape', 'stp']);
  assert.equal(manifest.bin.stacktape, manifest.bin.stp);

  const declaredPackagePaths = [
    manifest.main,
    manifest.types,
    ...Object.values(manifest.bin),
    ...Object.values(manifest.exports).flatMap(getExportPaths)
  ];
  for (const packagePath of new Set(declaredPackagePaths)) {
    assert.ok(
      existsSync(resolvePackagePath(packageDir, packagePath)),
      `Declared package path is missing: ${packagePath}`
    );
  }

  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    assert.ok(dependency.length > 0, 'Runtime dependency names must not be empty');
    assert.ok(!version.startsWith('workspace:'), `Published dependency ${dependency} must not use workspace protocol`);
    assert.ok(!version.startsWith('file:'), `Published dependency ${dependency} must not use a local file protocol`);
  }
  await assertContains(join(packageDir, 'index.d.ts'), ['defineConfig', 'LambdaFunction', 'DynamoDbTable']);
  await assertContains(join(packageDir, 'types.d.ts'), ['StacktapeConfig', 'LambdaFunction']);
  // These are published aliases into ./plain that used to point at types the generator never emitted.
  await assertContains(join(packageDir, 'plain.d.ts'), ['BudgetControl', 'IotIntegrationProps']);
  // Whatever this artifact is, a strict consumer has to be able to compile against it. Bound to `packageDir`
  // so the installed tarball is what gets verified, never a leftover __release-npm directory.
  verifyNpmDeclarations({ packageDir });
  await assertContains(join(packageDir, 'cloudformation.d.ts'), ['AWS::Lambda::Function', 'AWS::DynamoDB::Table']);

  const runtimeExports = await import(`${pathToFileURL(join(packageDir, manifest.main)).href}?baseline=${Date.now()}`);
  assert.equal(typeof runtimeExports.defineConfig, 'function');
  assert.equal(typeof runtimeExports.LambdaFunction, 'function');
  assert.equal(typeof runtimeExports.$ResourceParam, 'function');

  const { files } = await pnpmPack({ packageDir, dryRun: true });
  const packedPaths = new Set(files.map(({ path }) => path.replaceAll('\\', '/')));
  const packedPayloadBytes = (
    await Promise.all([...packedPaths].map(async (path) => (await stat(resolvePackagePath(packageDir, path))).size))
  ).reduce((total, size) => total + size, 0);
  assert.ok(
    packedPayloadBytes <= 10 * 1024 * 1024,
    `The npm launcher payload is ${(packedPayloadBytes / 1024 / 1024).toFixed(1)} MiB; expected at most 10 MiB`
  );
  const requiredPaths = [
    'package.json',
    'index.js',
    'index.d.ts',
    'types.d.ts',
    'cloudformation.d.ts',
    // index.d.ts and types.d.ts both alias into ./plain; without it every published alias dangles.
    'plain.d.ts',
    'bin/stacktape.js'
  ];
  if (requireChecksums) {
    requiredPaths.push('SHA256SUMS');
    assert.ok(existsSync(join(packageDir, 'SHA256SUMS')), 'NPM release artifact is missing SHA256SUMS');
  }
  for (const requiredPath of requiredPaths) {
    assert.ok(packedPaths.has(requiredPath), `pnpm pack output is missing ${requiredPath}`);
  }

  assert.ok(
    ![...packedPaths].some((path) => path.startsWith('llm-docs/')),
    'The npm launcher must not duplicate documentation already carried by the downloaded native archive'
  );
  assert.ok(
    ![...packedPaths].some((path) => path.includes('node_modules/')),
    'pnpm pack output must exclude node_modules'
  );

  return {
    version: manifest.version,
    fileCount: files.length,
    runtimeExportCount: Object.keys(runtimeExports).length
  };
};

const main = async () => {
  const expectedVersionIndex = process.argv.indexOf('--expected-version');
  const expectedVersion = expectedVersionIndex === -1 ? undefined : process.argv[expectedVersionIndex + 1];
  if (expectedVersionIndex !== -1 && !expectedVersion) {
    throw new Error('--expected-version requires a version.');
  }
  const result = await verifyNpmPackage({
    requireChecksums: process.argv.includes('--require-checksums'),
    expectedVersion
  });
  console.info(
    `Verified stacktape@${result.version}: ${result.fileCount} packed files, ${result.runtimeExportCount} runtime exports.`
  );
};

if (import.meta.main) {
  main();
}
