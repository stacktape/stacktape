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
  const linksTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'code',
        type: 'string'
      }
    }
  });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 512,
    connectTo: [linksTable],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/',
        method: '*'
      }),
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/{proxy+}',
        method: '*'
      })
    ]
  });

  return {
    resources: { apiGateway, linksTable, api }
  };
});
