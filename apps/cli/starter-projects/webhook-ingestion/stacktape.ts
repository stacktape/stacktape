import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  SqsIntegration,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const webhookQueue = new SqsQueue({
    visibilityTimeoutSeconds: 120
  });
  const receiveWebhook = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/receive.ts'
    }),
    memory: 512,
    connectTo: [webhookQueue],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/webhooks',
        method: 'POST'
      })
    ]
  });
  const processWebhook = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      new SqsIntegration({
        sqsQueueName: 'webhookQueue',
        batchSize: 10
      })
    ]
  });

  return {
    resources: { apiGateway, webhookQueue, receiveWebhook, processWebhook }
  };
});
