import type { StacktapeCliArgs } from 'src/config/cli/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import {
  opensearchSearch,
  opensearchGet,
  opensearchIndices,
  opensearchMapping,
  opensearchCount
} from '@domain-services/debug-services/db-client';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';
import { parseJsonObjectArgument } from '../_utils/parse-json-argument';

const SUPPORTED_OPERATIONS = ['search', 'get', 'indices', 'mapping', 'count'] as const;
type Operation = (typeof SUPPORTED_OPERATIONS)[number];

export const commandQueryOpensearch = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  initDebugAgentCredentials();

  const args = globalStateManager.args as StacktapeCliArgs & {
    operation?: string;
    index?: string;
    id?: string;
    query?: string;
    limit?: number;
  };

  const { resourceName, operation = 'indices', index, id, query, limit = 10 } = args;

  if (!resourceName) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_RESOURCE_REQUIRED',
      message: 'Missing required flag `--resourceName`.',
      hints: 'Provide `--resourceName <opensearchDomainName>`.'
    });
  }

  if (!SUPPORTED_OPERATIONS.includes(operation as Operation)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_OPERATION_INVALID',
      message: `Invalid OpenSearch query operation \`${operation}\`.`,
      hints: `Supported operations: ${SUPPORTED_OPERATIONS.join(', ')}.`
    });
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_RESOURCE_NOT_FOUND',
      message: `Resource \`${resourceName}\` does not exist in the deployed stack.`
    });
  }

  if (resource.resourceType !== 'open-search-domain') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_RESOURCE_TYPE_INVALID',
      message: `Resource \`${resourceName}\` is not an OpenSearch domain (type: \`${resource.resourceType}\`).`,
      hints: '`query:opensearch` supports `open-search-domain` resources only.'
    });
  }

  // Get endpoint from deployed resource
  const params = resource.referencableParams as Record<string, { value: unknown } | undefined>;
  const endpoint = params.domainEndpoint?.value as string;

  if (!endpoint) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_ENDPOINT_UNAVAILABLE',
      message: 'Could not retrieve the OpenSearch endpoint.',
      hints: 'Ensure the OpenSearch domain is deployed and accessible.'
    });
  }

  // Get credentials (uses debug agent role if available, otherwise user credentials)
  const credentials = await getDebugAgentCredentials();

  const conn = {
    mode: 'deployed' as const,
    endpoint: endpoint.startsWith('https://') ? endpoint : `https://${endpoint}`,
    region: globalStateManager.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  };

  let result;

  switch (operation as Operation) {
    case 'indices':
      result = await opensearchIndices(conn);
      break;

    case 'count':
      result = await opensearchCount(conn, { index });
      break;

    case 'mapping':
      if (!index) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_OPENSEARCH_INDEX_REQUIRED',
          message: 'Missing required flag `--index` for the mapping operation.',
          hints: 'Provide `--index <indexName>`.'
        });
      }
      result = await opensearchMapping(conn, { index });
      break;

    case 'get':
      if (!index || !id) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_OPENSEARCH_DOCUMENT_ID_REQUIRED',
          message: 'The get operation requires both `--index` and `--id`.',
          hints: 'Provide `--index <indexName> --id <documentId>`.'
        });
      }
      result = await opensearchGet(conn, { index, id });
      break;

    case 'search':
      if (!query) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_OPENSEARCH_QUERY_REQUIRED',
          message: 'Missing required flag `--query` for the search operation.',
          hints: 'For example, provide `--query \'{"match_all":{}}\'`.'
        });
      }
      result = await opensearchSearch(conn, {
        query: parseJsonObjectArgument({
          value: query,
          flag: '--query',
          code: 'CLI_OPENSEARCH_QUERY_INVALID',
          example: '--query \'{"match_all":{}}\''
        }),
        index,
        limit
      });
      break;
  }

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new CliError({
      category: 'CLI',
      code: 'CLI_OPENSEARCH_QUERY_FAILED',
      message: `OpenSearch query failed: ${errResult.error}`,
      hints: errResult.hint
    });
  }

  // Output
  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ ok: true, resource: resourceName, operation, ...result }, null, 2));
  } else {
    tuiManager.info(`OpenSearch ${operation} result for "${resourceName}":\n`);
    tuiManager.info(JSON.stringify(result, null, 2));
  }

  return null;
};
