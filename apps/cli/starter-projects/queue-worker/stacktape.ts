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
  const jobQueue = new SqsQueue({});
  const enqueueJob = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/enqueue.ts'
    }),
    memory: 512,
    connectTo: [jobQueue],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/enqueue',
        method: 'POST'
      })
    ]
  });
  const processJob = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process.ts'
    }),
    memory: 512,
    timeout: 30,
    events: [
      new SqsIntegration({
        sqsQueueName: 'jobQueue',
        batchSize: 10
      })
    ]
  });

  return {
    resources: { apiGateway, jobQueue, enqueueJob, processJob }
  };
});
