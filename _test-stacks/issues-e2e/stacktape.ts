import {
  defineConfig,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  // TypeScript Lambda — tests uncaught throw, console.error, different error types
  const tsLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/throwing-ts.ts'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // Python Lambda — tests Python traceback parsing
  const pyLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/throwing-py.py'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // Go Lambda — tests Go error return format
  const goLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/go-lambda/main.go'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // Java Lambda — tests Java exception + stack trace parsing
  const javaLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/java-lambda/src/main/java/example/Handler.java',
      handlerFunction: 'Handler',
      languageSpecificConfig: { javaVersion: 17 }
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // TypeScript Container (WebService) — tests container error detection
  const tsWebService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/ts-container/server.ts'
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    resources: { tsLambda, pyLambda, goLambda, javaLambda, tsWebService }
  };
});
