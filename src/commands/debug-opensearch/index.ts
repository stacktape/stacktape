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
import { stpErrors } from '@errors';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const SUPPORTED_OPERATIONS = ['search', 'get', 'indices', 'mapping', 'count'] as const;
type Operation = (typeof SUPPORTED_OPERATIONS)[number];

export const commandDebugOpensearch = async () => {
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
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --resourceName',
      'Provide --resourceName <opensearchDomainName>'
    );
  }

  if (!SUPPORTED_OPERATIONS.includes(operation as Operation)) {
    throw new ExpectedError(
      'CLI',
      `Invalid operation: ${operation}`,
      `Supported operations: ${SUPPORTED_OPERATIONS.join(', ')}`
    );
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw stpErrors.e98({ stpResourceName: resourceName });
  }

  if (resource.resourceType !== 'open-search-domain') {
    throw new ExpectedError(
      'CLI',
      `Resource "${resourceName}" is not an OpenSearch domain (type: ${resource.resourceType})`,
      'debug:opensearch supports open-search-domain resources only'
    );
  }

  // Get endpoint from deployed resource
  const params = resource.referencableParams as Record<string, { value: unknown } | undefined>;
  const endpoint = params.domainEndpoint?.value as string;

  if (!endpoint) {
    throw new ExpectedError(
      'CLI',
      'Could not retrieve OpenSearch endpoint',
      'Ensure the OpenSearch domain is deployed and accessible'
    );
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
        throw new ExpectedError(
          'CLI',
          'Missing required flag: --index for mapping operation',
          'Provide --index <indexName>'
        );
      }
      result = await opensearchMapping(conn, { index });
      break;

    case 'get':
      if (!index || !id) {
        throw new ExpectedError(
          'CLI',
          'Missing required flags: --index and --id for get operation',
          'Provide --index <indexName> --id <documentId>'
        );
      }
      result = await opensearchGet(conn, { index, id });
      break;

    case 'search':
      if (!query) {
        throw new ExpectedError(
          'CLI',
          'Missing required flag: --query for search operation',
          'Provide --query \'{"match_all": {}}\' (JSON query DSL)'
        );
      }
      try {
        const queryObj = JSON.parse(query);
        result = await opensearchSearch(conn, { query: queryObj, index, limit });
      } catch {
        throw new ExpectedError('CLI', 'Invalid JSON in --query', 'Provide valid OpenSearch query DSL JSON');
      }
      break;
  }

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new ExpectedError('CLI', `OpenSearch error: ${errResult.error}`, errResult.hint);
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
