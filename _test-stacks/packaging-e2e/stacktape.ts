import {
  BatchJob,
  defineConfig,
  LambdaFunction,
  MultiContainerWorkload,
  PrivateService,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService,
  WorkerService
} from '../../__release-npm';

export default defineConfig(() => {
  const pyLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/py-lambda/handler.py',
      languageSpecificConfig: {
        pythonVersion: 3.11,
        packageManager: 'uv'
      }
    })
  });

  const rbLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/rb-lambda/handler.rb',
      handlerFunction: 'handler'
    })
  });

  const phpLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/php-lambda/handler.php',
      handlerFunction: 'handler',
      languageSpecificConfig: {
        phpVersion: 8.3
      }
    })
  });

  const dotnetLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/dotnet-lambda/Function.cs',
      handlerFunction: 'Function::Function.Function::FunctionHandler',
      languageSpecificConfig: {
        dotnetVersion: 8
      }
    })
  });

  const javaLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/java-lambda/src/main/java/example/Handler.java',
      handlerFunction: 'Handler',
      languageSpecificConfig: {
        javaVersion: 17
      }
    })
  });

  const workerService = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/go-worker/main.go'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const rubyWorker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/rb-worker/worker.rb'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const phpWorker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/php-worker/worker.php',
      languageSpecificConfig: {
        phpVersion: 8.3
      }
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const dotnetWorker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/dotnet-worker/Program.cs',
      languageSpecificConfig: {
        dotnetVersion: 8
      }
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const privateService = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/py-private/app.py',
      languageSpecificConfig: {
        pythonVersion: 3.11,
        packageManager: 'uv'
      }
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  const webService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/py-private/app.py',
      languageSpecificConfig: {
        pythonVersion: 3.11,
        packageManager: 'uv'
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
        entryfilePath: './src/java-batch/src/main/java/com/example/App.java',
        languageSpecificConfig: {
          javaVersion: 17
        }
      })
    },
    resources: {
      cpu: 1,
      memory: 1024
    }
  });

  const multiContainerWorkload = new MultiContainerWorkload({
    containers: [
      {
        name: 'python-container',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/py-private/app.py',
          languageSpecificConfig: {
            pythonVersion: 3.11,
            packageManager: 'uv'
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
    resources: {
      pyLambda,
      javaLambda,
      rbLambda,
      phpLambda,
      dotnetLambda,
      webService,
      workerService,
      rubyWorker,
      phpWorker,
      dotnetWorker,
      privateService,
      batchJob,
      multiContainerWorkload
    }
  };
});
