import { expect, test } from 'bun:test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildOfflineQualificationEnvironment } from '../qualification/offline-aws';
import { runProcess } from '../qualification/process';
import { createInitSandbox } from './harness';

test('packaging and cleanup failures both survive in the qualification diagnostic', async () => {
  const sandbox = await createInitSandbox({ files: () => ({ 'package.json': '{"name":"broken-project"}' }) });
  const cliDirectory = join(import.meta.dir, '..', '..');
  const script = join(sandbox.root, 'cleanup-fault.ts');
  try {
    // Isolate the deliberate lifecycle fault in a child so no other test sees a mocked module. The fixture
    // still starts real MiniStack, removes its container and verifies removal before reporting the fault.
    await writeFile(
      script,
      `
import { mock } from 'bun:test';
const fixturePath = ${JSON.stringify(Bun.resolveSync('@stacktape/ministack/fixture', cliDirectory))};
const fixture = await import(fixturePath);
const start = fixture.startMiniStack;
mock.module(fixturePath, () => ({ ...fixture, startMiniStack: async (options) => {
  const instance = await start(options);
  return { ...instance, stop: async () => {
    await instance.stop();
    throw new Error('INJECTED_CLEANUP_FAILURE');
  } };
} }));
const { packageWithSourceCli, errorText } = await import(${JSON.stringify(join(cliDirectory, 'scripts/qualification/source-cli-packaging.ts'))});
const { startOfflineAwsServer } = await import(${JSON.stringify(join(cliDirectory, 'scripts/qualification/offline-aws.ts'))});
const offlineServer = await startOfflineAwsServer();
try {
  await packageWithSourceCli({
    label: 'diagnostic-${sandbox.id}', projectName: 'broken-project',
    projectRoot: ${JSON.stringify(sandbox.project)}, homeDirectory: ${JSON.stringify(sandbox.home)},
    configPath: ${JSON.stringify(join(sandbox.project, 'missing.yml'))},
    templatePath: ${JSON.stringify(join(sandbox.root, 'template.json'))}, offlineServer
  });
  throw new Error('The absent configuration unexpectedly packaged.');
} catch (error) {
  console.log(JSON.stringify({ name: error.name, diagnostic: errorText(error) }));
} finally {
  await offlineServer.close();
}
`
    );
    const result = await runProcess({
      command: process.execPath,
      args: ['--no-env-file', '--preload', join(cliDirectory, 'scripts/network-guard-preload.ts'), script],
      cwd: cliDirectory,
      env: buildOfflineQualificationEnvironment({
        endpoint: 'http://127.0.0.1:9',
        invocationId: `diagnostic-${sandbox.id}`,
        homeDirectory: sandbox.home
      }),
      timeoutMs: 180_000
    });
    expect(result.exitCode, result.stderr).toBe(0);
    const failure = JSON.parse(result.stdout) as { name: string; diagnostic: string };
    expect(failure.name).toBe('AggregateError');
    expect(failure.diagnostic).toContain('ENOENT');
    expect(failure.diagnostic).toContain('missing.yml');
    expect(failure.diagnostic).toContain('INJECTED_CLEANUP_FAILURE');
  } finally {
    await sandbox.cleanup();
  }
}, 200_000);
