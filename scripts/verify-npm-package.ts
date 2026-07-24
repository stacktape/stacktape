import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NPM_RELEASE_FOLDER_PATH } from '../shared/naming/project-fs-paths';

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
  requireChecksums = false
}: {
  packageDir?: string;
  requireChecksums?: boolean;
} = {}) => {
  assert.ok(isAbsolute(packageDir), 'NPM artifact path must be absolute');
  const manifestPath = join(packageDir, 'package.json');
  assert.ok(existsSync(manifestPath), `NPM artifact is missing: ${manifestPath}`);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest;
  assert.equal(manifest.name, 'stacktape');
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+].+)?$/);
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
  await assertContains(join(packageDir, 'cloudformation.d.ts'), ['AWS::Lambda::Function', 'AWS::DynamoDB::Table']);

  const runtimeExports = await import(`${pathToFileURL(join(packageDir, manifest.main)).href}?baseline=${Date.now()}`);
  assert.equal(typeof runtimeExports.defineConfig, 'function');
  assert.equal(typeof runtimeExports.LambdaFunction, 'function');
  assert.equal(typeof runtimeExports.$ResourceParam, 'function');

  const dryRun = Bun.spawnSync({
    cmd: ['npm', 'pack', '--dry-run', '--json'],
    cwd: packageDir,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  assert.equal(dryRun.exitCode, 0, dryRun.stderr.toString());
  const [{ files }] = JSON.parse(dryRun.stdout.toString()) as [{ files: Array<{ path: string }> }];
  const packedPaths = new Set(files.map(({ path }) => path.replaceAll('\\', '/')));
  const requiredPaths = [
    'package.json',
    'index.js',
    'index.d.ts',
    'types.d.ts',
    'cloudformation.d.ts',
    'bin/stacktape.js'
  ];
  if (requireChecksums) {
    requiredPaths.push('SHA256SUMS');
    assert.ok(existsSync(join(packageDir, 'SHA256SUMS')), 'NPM release artifact is missing SHA256SUMS');
  }
  for (const requiredPath of requiredPaths) {
    assert.ok(packedPaths.has(requiredPath), `npm pack output is missing ${requiredPath}`);
  }

  assert.ok(
    [...packedPaths].some((path) => path.startsWith('llm-docs/')),
    'npm pack output must include the bundled LLM documentation'
  );
  assert.ok(
    ![...packedPaths].some((path) => path.includes('node_modules/')),
    'npm pack output must exclude node_modules'
  );

  return {
    version: manifest.version,
    fileCount: files.length,
    runtimeExportCount: Object.keys(runtimeExports).length
  };
};

const main = async () => {
  const result = await verifyNpmPackage({ requireChecksums: process.argv.includes('--require-checksums') });
  console.info(
    `Verified stacktape@${result.version}: ${result.fileCount} packed files, ${result.runtimeExportCount} runtime exports.`
  );
};

if (import.meta.main) {
  main();
}
