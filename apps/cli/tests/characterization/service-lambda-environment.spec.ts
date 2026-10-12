import { expect, test } from 'bun:test';
import { join } from 'node:path';

// IS_DEV is captured at import time. Use separate CLI processes for source-dev and release behavior.
test.each(['true', 'false'])(
  'synthesizes the service Lambda environment with STP_DEV_MODE=%s',
  async (mode) => {
    const cliRoot = join(import.meta.dir, '../..');
    const child = Bun.spawn(
      [
        process.execPath,
        '--preload',
        './scripts/test-preload.ts',
        '-e',
        `
      import { synthesizeFixture } from './tests/characterization/synthesis-fixture.ts';
      import { getStacktapeServiceLambdaEnvironment } from './src/domain/config-manager/utils/lambdas.ts';
      import { defineConfig } from '@stacktape/config-authoring';
      const config = defineConfig(() => ({ resources: {} }));
      const template = await synthesizeFixture({
        compiledConfig: config({ projectName: 'test', stage: 'test', region: 'eu-west-1', cliArgs: {}, command: 'synth', awsProfile: '', user: {} }),
        workingDir: process.cwd()
      });
      const environment = getStacktapeServiceLambdaEnvironment({ projectName: 'test', stackName: 'test-test', globallyUniqueStackHash: 'test', stage: 'test' });
      console.log(JSON.stringify({ template, environment }));
    `
      ],
      { cwd: cliRoot, env: { ...process.env, STP_DEV_MODE: mode }, stdout: 'pipe', stderr: 'pipe' }
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text()
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout) as {
      environment: { name: string; value: unknown }[];
      template: {
        Resources: Record<
          string,
          { Type: string; Properties?: { Environment?: { Variables: Record<string, unknown> } } }
        >;
      };
    };
    const serviceLambda = Object.values(result.template.Resources).find(
      (resource) => resource.Type === 'AWS::Lambda::Function'
    );
    expect(serviceLambda).toBeDefined();
    if (mode === 'true') {
      expect(result.environment.find(({ name }) => name === 'DEV_MODE')?.value).toBe('true');
      expect(serviceLambda?.Properties?.Environment?.Variables.DEV_MODE).toBe('true');
    } else {
      expect(result.environment.some(({ name }) => name === 'DEV_MODE')).toBe(false);
      expect(serviceLambda?.Properties?.Environment?.Variables).not.toHaveProperty('DEV_MODE');
    }
  },
  20_000
);
