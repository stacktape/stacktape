import { describe, expect, test } from 'bun:test';
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
          secretValue
        }
      })
    );

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(secretValue);
    expect(serialized).not.toContain('user:password@');
    expect(serialized).toContain('postgresql://<REDACTED>@');
    expect(payload.data).toMatchObject({
      secretName: 'database-password',
      secretFile: './secret.txt'
    });
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
          stackName: 'project-stage',
          region: 'eu-west-1',
          stackOutput: {
            StpStackInfoMap: {
              resources: JSON.stringify({
                api: {
                  resourceType: 'function',
                  cloudformationChildResources: {
                    ApiFunction: { cloudformationResourceType: 'AWS::Lambda::Function' }
                  }
                }
              })
            }
          },
          stackResources: [
            {
              LogicalResourceId: 'ApiFunction',
              ResourceType: 'AWS::Lambda::Function',
              ResourceStatus: 'CREATE_COMPLETE'
            }
          ]
        }
      }
    });

    const cli = output.data?.cli as Record<string, unknown>;
    const stacktapeResources = cli.stacktapeResources as Record<string, unknown>;
    const cloudformation = cli.cloudformation as Record<string, unknown>;

    expect(stacktapeResources.resourceCount).toBe(1);
    expect(cloudformation.resourceCount).toBe(1);
    expect(cloudformation.resourceTypeCounts).toEqual({ 'AWS::Lambda::Function': 1 });
    expect(output.rawTail).toBeUndefined();
  });
});
