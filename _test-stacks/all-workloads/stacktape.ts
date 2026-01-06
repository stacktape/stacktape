import {
  BatchJob,
  defineConfig,
  LambdaFunction,
  MultiContainerWorkload,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambda.ts'
    }),
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    }
  });

  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/container.ts',
      // Fastify uses dynamic requires that don't work when bundled to ESM
      languageSpecificConfig: {
        dependenciesToExcludeFromBundle: ['fastify']
      }
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const batchJob = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './src/batch-job.ts'
      })
    },
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  const multiContainerWorkload = new MultiContainerWorkload({
    containers: [
      {
        name: 'lopuch',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/container.ts',
          languageSpecificConfig: {
            dependenciesToExcludeFromBundle: ['fastify']
          }
        })
      }
    ],
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { lambda, webService, batchJob, multiContainerWorkload }
  };
});
