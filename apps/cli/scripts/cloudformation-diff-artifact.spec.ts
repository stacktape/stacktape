import { expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createCloudFormationSpecBuildPlugin } from './support/cloudformation-spec-loader';

test('the compiled CloudFormation diff retains its service database without build-machine files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-cfn-artifact-'));
  const sourceDirectory = join(directory, 'build-input');
  const copiedSpec = join(sourceDirectory, 'node_modules/@aws-cdk/aws-service-spec');
  const require = createRequire(import.meta.url);
  const diffEntry = require.resolve('@aws-cdk/cloudformation-diff');
  const diffRequire = createRequire(diffEntry);
  const specEntry = diffRequire.resolve('@aws-cdk/aws-service-spec');
  const specRequire = createRequire(specEntry);
  try {
    await cp(dirname(dirname(specEntry)), copiedSpec, { recursive: true });
    const entrypoint = join(sourceDirectory, 'proof.ts');
    await writeFile(
      entrypoint,
      `
import assert from 'node:assert/strict';
import { diffTemplate, ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { loadAwsServiceSpec } from '@aws-cdk/aws-service-spec';
const template = name => ({ Resources: { Bucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: name } } } });
assert.equal(diffTemplate(template('before'), template('after')).resources.get('Bucket').changeImpact, ResourceImpact.WILL_REPLACE);
const db = await loadAwsServiceSpec();
assert.equal(db.lookup('resource', 'cloudFormationType', 'equals', 'AWS::S3::Bucket').length, 1);
console.log('Standalone CloudFormation diff and asynchronous database loading passed.');
`
    );
    const binary = join(directory, process.platform === 'win32' ? 'proof.exe' : 'proof');
    const build = await Bun.build({
      entrypoints: [entrypoint],
      compile: { outfile: binary },
      plugins: [
        {
          name: 'isolated-real-service-spec',
          setup(build) {
            build.onResolve(
              { filter: /^@aws-cdk\/(cloudformation-diff|aws-service-spec|service-spec-types)$/ },
              (args) => ({
                path:
                  args.path === '@aws-cdk/cloudformation-diff'
                    ? diffEntry
                    : args.path === '@aws-cdk/aws-service-spec'
                      ? join(copiedSpec, 'lib/index.js')
                      : specRequire.resolve(args.path)
              })
            );
          }
        },
        createCloudFormationSpecBuildPlugin()
      ]
    });
    expect(build.success, build.logs.map((log) => log.message).join('\n')).toBe(true);
    // Remove only this test's real dependency copy. The executable must contain everything it loaded from it.
    await rm(sourceDirectory, { recursive: true, force: true });
    const runtimeDirectory = join(directory, 'runtime');
    await mkdir(runtimeDirectory);
    const result = Bun.spawnSync([binary], { cwd: runtimeDirectory, stdout: 'pipe', stderr: 'pipe', timeout: 30_000 });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(
      'Standalone CloudFormation diff and asynchronous database loading passed.'
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
