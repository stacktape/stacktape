import {
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const mainDynamoDbTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'id',
        type: 'string'
      }
    }
  });
  const savePost = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/save-post/main.go'
    }),
    memory: 512,
    connectTo: [mainDynamoDbTable],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'POST'
      })
    ]
  });
  const getPosts = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/get-posts/main.go'
    }),
    memory: 512,
    connectTo: [mainDynamoDbTable],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/posts',
        method: 'GET'
      })
    ]
  });

  return {
    resources: { mainApiGateway, mainDynamoDbTable, savePost, getPosts }
  };
});
