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
      entryfilePath: './src/main/java/posts/SavePost.java',
      languageSpecificConfig: {
        javaVersion: 17
      }
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
      entryfilePath: './src/main/java/posts/GetPosts.java',
      languageSpecificConfig: {
        javaVersion: 17
      }
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
