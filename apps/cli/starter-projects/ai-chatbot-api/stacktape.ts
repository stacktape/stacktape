import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const chat = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 1024,
    timeout: 60,
    environment: { AI_MODEL: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
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
    resources: { chat }
  };
});
