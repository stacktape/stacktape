/** The TypeScript form of ../directives/stacktape.yml: the same resources, references and stage-dependent values. */
import {
  $CfFormat,
  $CfResourceParam,
  $ResourceParam,
  $Stage,
  defineConfig,
  DynamoDbTable,
  HostingBucket,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction
} from '@stacktape/config-authoring';

const stages: Record<string, { memory: number }> = { production: { memory: 1024 }, staging: { memory: 512 } };

export default defineConfig({ projectName: 'directive-project' }, ({ stage, region }) => {
  const gateway = new HttpApiGateway({});
  const records = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
  const site = new HostingBucket({ uploadDirectoryPath: './src' });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    runtime: 'nodejs22.x',
    memory: stages[stage].memory,
    logging: { retentionDays: 7 },
    environment: {
      FORMATTED_REFERENCE: $CfFormat('{}-{}-{}', $ResourceParam('records', 'name'), $Stage(), 'ready'),
      FORMATTED_LITERAL: $CfFormat('{}-{}', `it's "ready"`, 0),
      FORMATTED_NO_VALUES: $CfFormat('literal text'),
      FORMATTED_BOUNDARIES: $CfFormat('{}-{}-{}', '$Stage() suffix', '$Stage() (prod)', 'C:\\workspace\\'),

      STAGE: stage,
      REGION: region,
      GREETING: `hello platform-team from ${stage}`,
      TABLE_NAME: $ResourceParam('records', 'name'),
      TABLE_ARN: $CfResourceParam('RecordsGlobalTable', 'Arn'),
      GATEWAY_URL: $ResourceParam('gateway', 'url')
    },
    events: [new HttpApiIntegration({ httpApiGatewayName: gateway, method: 'GET', path: '/' })],
    connectTo: [records, site]
  });
  return { resources: { gateway, api, records, site } };
});
