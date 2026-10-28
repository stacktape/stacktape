import { describe, expect, test } from 'bun:test';
import { INFO_STACK_AGENT_SCHEMA_VERSION } from '../info-stack/agent-contract';
import { buildCliRunOutput, toToolText } from './tool-output';

const readPayload = (result: ReturnType<typeof toToolText>): Record<string, unknown> =>
  JSON.parse(result.content[0].text) as Record<string, unknown>;

describe('MCP tool output', () => {
  test('masks secret values and credential patterns without hiding secret identifiers', () => {
    const secretValue = 'stp_live_keyid_abcdefghijklmnopqrstuvwxyz';
    const payload = readPayload(
      toToolText({
        ok: false,
        code: 'FAILED',
        message: `Connection failed for postgresql://user:password@example.com/db using ${secretValue}`,
        data: {
          secretName: 'database-password',
          secretFile: './secret.txt',
          secretValue: 'opaque',
          nested: [{ password: 'hidden', note: 'visible' }]
        }
      })
    );

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(secretValue);
    expect(serialized).not.toContain('user:password@');
    expect(serialized).not.toContain('opaque');
    expect(serialized).not.toContain('hidden');
    expect(serialized).toContain('postgresql://<REDACTED>@');
    expect(payload.data).toMatchObject({
      secretName: 'database-password',
      secretFile: './secret.txt',
      secretValue: '******',
      nested: [{ password: '******', note: 'visible' }]
    });
  });

  test('removes terminal color codes from script output', () => {
    const payload = readPayload(
      toToolText({
        ok: true,
        code: 'OK',
        message: 'Ran script seed against the local databases.',
        data: { output: ['seed-keyboard \u001B[33m201\u001B[39m', '\u001B[1m\u001B[32mdone\u001B[39m\u001B[22m'] }
      })
    );
    expect(payload.data).toEqual({ output: ['seed-keyboard 201', 'done'] });
  });

  test('compacts info:stack data into Stacktape and CloudFormation summaries', () => {
    const output = buildCliRunOutput({
      command: 'info:stack',
      policy: { category: 'diagnostics', safety: 'readOnly' },
      result: {
        ok: true,
        code: 'OK',
        message: 'Fetched stack info.',
        data: {
          result: {
            schemaVersion: INFO_STACK_AGENT_SCHEMA_VERSION,
            stackName: 'project-stage',
            region: 'eu-west-1',
            description: null,
            stackOutput: {},
            stackInfoMap: {
              resources: {
                api: {
                  resourceType: 'function',
                  cloudformationChildResources: {
                    ApiFunction: { cloudformationResourceType: 'AWS::Lambda::Function' }
                  }
                }
              }
            },
            resources: [
              {
                LogicalResourceId: 'ApiFunction',
                ResourceType: 'AWS::Lambda::Function',
                ResourceStatus: 'CREATE_COMPLETE'
              }
            ]
          }
        }
      }
    });

    const cli = output.data?.cli as Record<string, unknown>;
    const stacktapeResources = cli.stacktapeResources as Record<string, unknown>;
    const cloudformation = cli.cloudformation as Record<string, unknown>;

    expect(cli.sourceSchemaVersion).toBe(INFO_STACK_AGENT_SCHEMA_VERSION);
    expect(stacktapeResources.resourceCount).toBe(1);
    expect(cloudformation.resourceCount).toBe(1);
    expect(cloudformation.resourceTypeCounts).toEqual({ 'AWS::Lambda::Function': 1 });
    expect(output.rawTail).toBeUndefined();
  });

  // r2xx: param get's value is its scalar result, which key-name masking never reached.
  test('withholds the result of a sensitive command that was asked to show secrets', () => {
    const canary = 'r2zz-fabricated-Xk29fQ7v';
    const run = (args: Record<string, unknown>) =>
      buildCliRunOutput({
        command: 'param:get',
        policy: { category: 'secrets', safety: 'readOnly', sensitiveOutput: true },
        args,
        result: { ok: true, code: 'OK', message: 'param get completed', data: { result: canary }, rawTail: canary }
      });

    const shown = run({ resourceName: 'db', paramName: 'password', showSensitiveValues: true });
    expect(JSON.stringify(shown)).not.toContain(canary);
    expect(shown.data?.cli).toEqual({ result: '[REDACTED: this command can return sensitive values]' });
    // Without the flag the CLI returns <<OMITTED>> for a sensitive parameter and the value of a plain one.
    expect(run({ resourceName: 'db', paramName: 'host' }).data?.cli).toEqual({ result: canary });
  });
});
