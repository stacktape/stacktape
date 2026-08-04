import { DynamoDbTable, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const conversations = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'conversationId',
        type: 'string'
      },
      sortKey: {
        name: 'timestamp',
        type: 'string'
      }
    }
  });
  const agent = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 1024,
    timeout: 120,
    connectTo: [conversations],
    environment: { AI_MODEL: 'anthropic.claude-3-7-sonnet-20250219-v1:0' },
    iamRoleStatements: [
      {
        Resource: ['*'],
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream']
      }
    ],
    url: {
      enabled: true,
      responseStreamEnabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['*'],
        allowedMethods: ['*'],
        allowedHeaders: ['*']
      }
    }
  });

  return {
    resources: { conversations, agent }
  };
});
