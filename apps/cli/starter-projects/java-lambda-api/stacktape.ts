import {
  BuildpackLambdaPackaging,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
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
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main/java/posts/SavePost.java'
    }),
    memory: 512,
    runtime: 'java17',
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
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main/java/posts/GetPosts.java'
    }),
    memory: 512,
    runtime: 'java17',
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
