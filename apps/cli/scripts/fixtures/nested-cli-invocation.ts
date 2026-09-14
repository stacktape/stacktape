import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { fsPaths } from 'src/config/runtime-paths';

// Run the real invocation initialization, then launch the compiled CLI as a hook would.
const verifyNestedInvocation = async () => {
  const parentInvocationId = process.env.STP_INVOCATION_ID;
  await globalStateManager.init({ commands: ['version'], args: {} });
  assert.equal(globalStateManager.invocationId, parentInvocationId, 'The runner operation ID must stay on the parent.');

  const artifacts = Object.values(globalStateManager.helperLambdaDetails);
  assert.ok(artifacts.length > 0, 'The parent must load real deployment artifacts.');
  const before = await Promise.all(artifacts.map(({ artifactPath }) => readFile(artifactPath)));
  const marker = join(fsPaths.absoluteTempFolderPath({ invocationId: parentInvocationId }), 'parent-only.txt');
  await writeFile(marker, 'parent deployment');

  const child = Bun.spawnSync({
    cmd: [process.argv[2], '--version'],
    cwd: process.cwd(),
    env: { ...process.env, STP_DEV_MODE: 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30_000
  });
  assert.equal(child.exitCode, 0, `Nested CLI failed: ${child.stdout.toString()}${child.stderr.toString()}`);
  assert.match(child.stdout.toString(), /Stacktape version:/);
  assert.equal(await readFile(marker, 'utf8'), 'parent deployment', 'Nested CLI deleted its parent working directory.');
  for (const [index, { artifactPath }] of artifacts.entries()) {
    assert.deepEqual(await readFile(artifactPath), before[index], 'Nested CLI changed a parent deployment artifact.');
  }
  console.info('Verified runner invocation ID and parent artifacts survive a nested compiled CLI command.');
};

verifyNestedInvocation().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
