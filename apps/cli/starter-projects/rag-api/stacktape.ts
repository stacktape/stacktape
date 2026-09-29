import {
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging,
  LambdaFunction,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const chunks = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'documentId',
        type: 'string'
      },
      sortKey: {
        name: 'chunkId',
        type: 'string'
      }
    }
  });
  const ingest = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/ingest.ts'
    }),
    memory: 1024,
    timeout: 120,
    connectTo: [chunks],
    iamRoleStatements: [
      {
        Resource: ['*'],
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel']
      }
    ],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/ingest',
        method: 'POST'
      })
    ]
  });
  const ask = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/ask.ts'
    }),
    memory: 1024,
    timeout: 60,
    connectTo: [chunks],
    iamRoleStatements: [
      {
        Resource: ['*'],
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream']
      }
    ],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/ask',
        method: 'POST'
      })
    ]
  });

  return {
    resources: { apiGateway, chunks, ingest, ask }
  };
});
