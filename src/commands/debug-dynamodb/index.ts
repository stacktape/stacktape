import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import {
  dynamoDbScan,
  dynamoDbQuery,
  dynamoDbGet,
  dynamoDbSchema,
  dynamoDbSample
} from '@domain-services/debug-services/db-client';
import { stpErrors } from '@errors';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const SUPPORTED_OPERATIONS = ['scan', 'query', 'get', 'schema', 'sample'] as const;
type Operation = (typeof SUPPORTED_OPERATIONS)[number];

export const commandDebugDynamodb = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  initDebugAgentCredentials();

  const args = globalStateManager.args as StacktapeCliArgs & {
    operation?: string;
    pk?: string;
    sk?: string;
    index?: string;
    limit?: number;
  };

  const { resourceName, operation = 'sample', pk, sk, index, limit = 100 } = args;

  if (!resourceName) {
    throw new ExpectedError('CLI', 'Missing required flag: --resourceName', 'Provide --resourceName <tableName>');
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

  if (resource.resourceType !== 'dynamo-db-table') {
    throw new ExpectedError(
      'CLI',
      `Resource "${resourceName}" is not a DynamoDB table (type: ${resource.resourceType})`,
      'debug:dynamodb supports dynamo-db-table resources only'
    );
  }

  // Get table name from deployed resource
  const params = resource.referencableParams as Record<string, { value: unknown } | undefined>;
  const tableName = (params.name?.value || params.tableName?.value || resourceName) as string;

  // Get credentials (uses debug agent role if available, otherwise user credentials)
  const credentials = await getDebugAgentCredentials();

  const conn = {
    mode: 'deployed' as const,
    tableName,
    region: globalStateManager.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  };

  let result;

  switch (operation as Operation) {
    case 'schema':
      result = await dynamoDbSchema(conn);
      break;

    case 'sample':
      result = await dynamoDbSample(conn, { limit });
      break;

    case 'scan':
      result = await dynamoDbScan(conn, { limit });
      break;

    case 'query':
      if (!pk) {
        throw new ExpectedError(
          'CLI',
          'Missing required flag: --pk for query operation',
          'Provide --pk \'{"partitionKeyName": "value"}\''
        );
      }
      try {
        const pkObj = JSON.parse(pk);
        const skObj = sk ? JSON.parse(sk) : undefined;
        result = await dynamoDbQuery(conn, { pk: pkObj, sk: skObj, index, limit });
      } catch {
        throw new ExpectedError('CLI', 'Invalid JSON in --pk or --sk', 'Provide valid JSON objects');
      }
      break;

    case 'get':
      if (!pk) {
        throw new ExpectedError(
          'CLI',
          'Missing required flag: --pk for get operation',
          'Provide --pk \'{"partitionKeyName": "value"}\''
        );
      }
      try {
        const pkObj = JSON.parse(pk);
        const skObj = sk ? JSON.parse(sk) : undefined;
        result = await dynamoDbGet(conn, { pk: pkObj, sk: skObj });
      } catch {
        throw new ExpectedError('CLI', 'Invalid JSON in --pk or --sk', 'Provide valid JSON objects');
      }
      break;
  }

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new ExpectedError('CLI', `DynamoDB error: ${errResult.error}`, errResult.hint);
  }

  // Output
  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ ok: true, resource: resourceName, operation, ...result }, null, 2));
  } else {
    tuiManager.info(`DynamoDB ${operation} result for "${resourceName}":\n`);
    tuiManager.info(JSON.stringify(result, null, 2));
  }

  return null;
};
