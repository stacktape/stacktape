/**
 * Disposable real-AWS project for the MCP real-task suite (`scripts/e2e-mcp/run-real-tasks.ts`): a small orders API
 * written the way a user's project looks, with a planted bug. Orders saved without customer details make
 * `GET /orders/:id` fail with a 500, which the debugging tasks ask agents to explain and fix.
 *
 * It imports from 'stacktape' like a user project; `real-tasks/prepare.sh` copies it out of the repository first.
 */
import {
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction,
  defineConfig
} from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: { enabled: true }
  });
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    }
  });
  const ordersApi = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    connectTo: [ordersTable],
    events: [
      new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/', method: '*' }),
      new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })
    ]
  });

  return {
    resources: { apiGateway, ordersTable, ordersApi }
  };
});
