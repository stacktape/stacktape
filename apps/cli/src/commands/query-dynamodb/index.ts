import type { StacktapeCliArgs } from 'src/config/cli/types';
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
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';
import { parseJsonObjectArgument } from '../_utils/parse-json-argument';

const SUPPORTED_OPERATIONS = ['scan', 'query', 'get', 'schema', 'sample'] as const;
type Operation = (typeof SUPPORTED_OPERATIONS)[number];

export const commandQueryDynamodb = async () => {
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
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DYNAMODB_RESOURCE_REQUIRED',
      message: 'Missing required flag `--resourceName`.',
      hints: 'Provide `--resourceName <tableName>`.'
    });
  }

  if (!SUPPORTED_OPERATIONS.includes(operation as Operation)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DYNAMODB_OPERATION_INVALID',
      message: `Invalid DynamoDB query operation \`${operation}\`.`,
      hints: `Supported operations: ${SUPPORTED_OPERATIONS.join(', ')}.`
    });
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DYNAMODB_RESOURCE_NOT_FOUND',
      message: `Resource \`${resourceName}\` does not exist in the deployed stack.`
    });
  }

  if (resource.resourceType !== 'dynamo-db-table') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DYNAMODB_RESOURCE_TYPE_INVALID',
      message: `Resource \`${resourceName}\` is not a DynamoDB table (type: \`${resource.resourceType}\`).`,
      hints: '`query:dynamodb` supports `dynamo-db-table` resources only.'
    });
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
        throw new CliError({
          category: 'CLI',
          code: 'CLI_DYNAMODB_PARTITION_KEY_REQUIRED',
          message: 'Missing required flag `--pk` for the query operation.',
          hints: 'For example, provide `--pk \'{"partitionKeyName":"value"}\'`.'
        });
      }
      result = await dynamoDbQuery(conn, {
        pk: parseJsonObjectArgument({
          value: pk,
          flag: '--pk',
          code: 'CLI_DYNAMODB_KEY_INVALID',
          example: '--pk \'{"partitionKeyName":"value"}\''
        }),
        sk: sk ? parseJsonObjectArgument({ value: sk, flag: '--sk', code: 'CLI_DYNAMODB_KEY_INVALID' }) : undefined,
        index,
        limit
      });
      break;

    case 'get':
      if (!pk) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_DYNAMODB_PARTITION_KEY_REQUIRED',
          message: 'Missing required flag `--pk` for the get operation.',
          hints: 'For example, provide `--pk \'{"partitionKeyName":"value"}\'`.'
        });
      }
      result = await dynamoDbGet(conn, {
        pk: parseJsonObjectArgument({
          value: pk,
          flag: '--pk',
          code: 'CLI_DYNAMODB_KEY_INVALID',
          example: '--pk \'{"partitionKeyName":"value"}\''
        }),
        sk: sk ? parseJsonObjectArgument({ value: sk, flag: '--sk', code: 'CLI_DYNAMODB_KEY_INVALID' }) : undefined
      });
      break;
  }

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DYNAMODB_QUERY_FAILED',
      message: `DynamoDB query failed: ${errResult.error}`,
      hints: errResult.hint
    });
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
