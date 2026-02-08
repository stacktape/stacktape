import {
  BatchJob,
  Bucket,
  CustomDockerfilePackaging,
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
  const outputBucket = new Bucket({});
  const inferenceJob = new BatchJob({
    container: {
      packaging: new CustomDockerfilePackaging({
        buildContextPath: './job'
      })
    },
    resources: {
      cpu: 4,
      memory: 16000,
      gpu: 1
    },
    useSpotInstances: true,
    retryConfig: {
      attempts: 2
    },
    connectTo: [outputBucket]
  });
  const triggerInference = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/trigger.ts'
    }),
    memory: 512,
    connectTo: [inferenceJob],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/infer',
        method: 'POST'
      })
    ]
  });

  return {
    resources: { apiGateway, outputBucket, inferenceJob, triggerInference }
  };
});
