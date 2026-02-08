import {
  DynamoDbTable,
  HostingBucket,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const todosTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'id',
        type: 'string'
      }
    }
  });
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 512,
    connectTo: [todosTable],
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
  const frontend = new HostingBucket({
    uploadDirectoryPath: './public',
    hostingContentType: 'single-page-app',
    injectEnvironment: [
      {
        name: 'API_URL',
        value: "$ResourceParam('apiGateway', 'url')"
      }
    ]
  });

  return {
    resources: { apiGateway, todosTable, api, frontend }
  };
});
