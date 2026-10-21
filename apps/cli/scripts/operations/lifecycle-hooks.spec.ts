import { afterAll, beforeAll, expect, test } from 'bun:test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

test('a failing before:delete hook stops the delete and leaves the stack in place', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const cloudformation = new CloudFormationClient(fixture.clientConfig());
  try {
    await seedDeployedStack(fixture);
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({
        resources: {},
        scripts: { guard: { type: 'local-script', properties: { executeCommand: 'echo j9-guard-refused; exit 4' } } },
        hooks: { beforeDelete: [{ scriptName: 'guard' }] }
      })
    );
    const result = await fixture.run(['delete', ...targetArgs, '--autoConfirmOperation', '--agent']);
    const { result: final } = parseCliJsonl(result.stdout, 'delete');
    expect(result.exitCode, final.message).toBe(1);
    expect(final.code).toBe('SCRIPT_ERROR');
    expect(final.message).toContain('beforeDelete hook');
    expect(fixture.aws.callsTo('cloudformation.DeleteStack')).toEqual([]);
    const { Stacks } = await cloudformation.send(new DescribeStacksCommand({ StackName: 'j9-operations-test' }));
    expect(Stacks?.[0]?.StackStatus).not.toContain('DELETE');
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    cloudformation.destroy();
    await fixture.close();
  }
}, 60_000);
