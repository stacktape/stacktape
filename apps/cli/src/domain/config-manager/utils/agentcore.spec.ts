import type { StpAgentCoreRuntime } from '@domain-services/config-manager/resolved-types/agentcore';
import { describe, expect, test } from 'bun:test';
import { validateAgentCoreRuntimeConfig } from './agentcore';

const runtime = (endpoints?: StpAgentCoreRuntime['endpoints']): StpAgentCoreRuntime =>
  ({ name: 'supportAgent', endpoints }) as StpAgentCoreRuntime;

describe('AgentCore runtime config validation', () => {
  test('allows omitted endpoints so the resolver can create the default endpoint', () => {
    expect(() => validateAgentCoreRuntimeConfig({ resource: runtime() })).not.toThrow();
  });

  test('rejects an explicitly empty endpoint list with guidance for the simple default', () => {
    expect(() => validateAgentCoreRuntimeConfig({ resource: runtime([]) })).toThrowError(
      expect.objectContaining({
        code: 'CONFIG_AGENTCORE_RUNTIME_ENDPOINTS_EMPTY',
        message: 'AgentCore runtime `supportAgent` has an empty `properties.endpoints` list.',
        hints: [
          'Remove `endpoints` to use the automatically created `default` endpoint, or configure at least one named endpoint.'
        ]
      })
    );
  });

  test('rejects duplicate names across string and object endpoint forms', () => {
    expect(() =>
      validateAgentCoreRuntimeConfig({
        resource: runtime(['preview', { name: 'stable' }, { name: 'preview', runtimeVersion: '2' }, 'stable'])
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'CONFIG_AGENTCORE_RUNTIME_ENDPOINT_NAMES_DUPLICATE',
        message: 'AgentCore runtime `supportAgent` defines duplicate endpoint name(s): `preview`, `stable`.'
      })
    );
  });
});
