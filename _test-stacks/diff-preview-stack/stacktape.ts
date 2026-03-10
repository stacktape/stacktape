import {
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  const notesTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'pk', type: 'string' },
      sortKey: { name: 'sk', type: 'string' }
    },
    enablePointInTimeRecovery: true,
    secondaryIndexes: [
      {
        name: 'status-index',
        partitionKey: { name: 'status', type: 'string' },
        projections: ['pk', 'sk']
      }
    ]
  });

  const apiLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api-lambda.ts'
    }),
    connectTo: [notesTable],
    url: {
      enabled: true,
      cors: { enabled: true }
    },
    environment: {
      TABLE_NAME: notesTable.name,
      FEATURE_FLAG: 'beta-preview'
    }
  });

  const reportLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/report-lambda.ts'
    }),
    connectTo: [notesTable],
    environment: {
      TABLE_NAME: notesTable.name,
      REPORT_MODE: 'summary'
    }
  });

  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/web-service.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 1024
    },
    connectTo: [notesTable],
    environment: {
      TABLE_NAME: notesTable.name,
      RELEASE_CHANNEL: 'preview-v2'
    }
  });

  return {
    resources: {
      notesTable,
      apiLambda,
      reportLambda,
      webService
    }
  };
});
