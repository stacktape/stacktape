import {
  defineConfig,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  // TS Lambda — for re-open test
  const tsLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/throwing-ts.ts' }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // Ruby Lambda
  const rbLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/rb-lambda/handler.rb',
      handlerFunction: 'handler'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // .NET Lambda
  const dotnetLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/dotnet-lambda/Function.cs',
      handlerFunction: 'Function::Function.Function::FunctionHandler',
      languageSpecificConfig: { dotnetVersion: 10 }
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // Go panic Lambda
  const goPanicLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/go-panic/main.go'
    }),
    url: { enabled: true, cors: { enabled: true } }
  });

  // TS Container — process-level crash for stack trace testing
  const tsContainer = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/ts-container/server.ts'
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    resources: { tsLambda, rbLambda, dotnetLambda, goPanicLambda, tsContainer }
  };
});
