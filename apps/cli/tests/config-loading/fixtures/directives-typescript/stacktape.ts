/** The TypeScript form of ../directives/stacktape.yml: the same resources, references and stage-dependent values. */
import {
  $CfResourceParam,
  $ResourceParam,
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction
} from '@stacktape/config-authoring';

const stages: Record<string, { memory: number }> = { production: { memory: 1024 }, staging: { memory: 512 } };

export default defineConfig(({ stage, region }) => {
  const gateway = new HttpApiGateway({});
  const records = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    memory: stages[stage].memory,
    logging: { retentionDays: 7 },
    environment: {
      STAGE: stage,
      REGION: region,
      GREETING: `hello platform-team from ${stage}`,
      TABLE_NAME: $ResourceParam('records', 'name'),
      TABLE_ARN: $CfResourceParam('RecordsGlobalTable', 'Arn'),
      GATEWAY_URL: $ResourceParam('gateway', 'url')
    },
    events: [new HttpApiIntegration({ httpApiGatewayName: gateway, method: 'GET', path: '/' })],
    connectTo: [records]
  });
  return { projectName: 'directive-project', resources: { gateway, api, records } };
});
