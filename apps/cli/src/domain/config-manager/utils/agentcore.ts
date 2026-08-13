import type { StpAgentCoreRuntime } from '@domain-services/config-manager/resolved-types/agentcore';
import { CliError } from '@utils/errors';

export const validateAgentCoreRuntimeConfig = ({ resource }: { resource: StpAgentCoreRuntime }) => {
  if (resource.endpoints && resource.endpoints.length === 0) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_AGENTCORE_RUNTIME_ENDPOINTS_EMPTY',
      message: `AgentCore runtime \`${resource.name}\` has an empty \`properties.endpoints\` list.`,
      hints:
        'Remove `endpoints` to use the automatically created `default` endpoint, or configure at least one named endpoint.'
    });
  }

  const endpointNames = resource.endpoints?.map((endpoint) =>
    typeof endpoint === 'string' ? endpoint : endpoint.name
  );
  const duplicateNames = [...new Set(endpointNames?.filter((name, index) => endpointNames.indexOf(name) !== index))];
  if (duplicateNames.length > 0) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_AGENTCORE_RUNTIME_ENDPOINT_NAMES_DUPLICATE',
      message: `AgentCore runtime \`${resource.name}\` defines duplicate endpoint name(s): ${duplicateNames
        .map((name) => `\`${name}\``)
        .join(', ')}.`,
      hints: 'Give every configured endpoint a unique name.'
    });
  }
};
