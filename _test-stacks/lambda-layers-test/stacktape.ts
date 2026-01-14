import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  // Three lambdas that all use bcrypt (native binary)
  // This tests that:
  // 1. Native binaries are installed via Docker
  // 2. If multiple lambdas use the same binary, it should be shared via layer

  const lambda1 = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambda1.ts'
    })
  });

  const lambda2 = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambda2.ts'
    })
  });

  const lambda3 = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/lambda3.ts'
    }),
    url: {
      enabled: true
    }
  });

  return {
    serviceName: 'lambda-layers-test',
    resources: { lambda1, lambda2, lambda3 }
  };
});
