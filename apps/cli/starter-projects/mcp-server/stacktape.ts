import { JsBundleLambdaPackaging, LambdaFunction, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const mcpServer = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 1024,
    timeout: 60,
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
    resources: { mcpServer }
  };
});
