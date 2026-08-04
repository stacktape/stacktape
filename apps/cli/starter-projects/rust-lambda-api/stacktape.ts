import {
  CustomArtifactLambdaPackaging,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LocalScript,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const api = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './target/lambda/rust-lambda-api/bootstrap.zip',
      handler: 'bootstrap:handler'
    }),
    memory: 256,
    runtime: 'provided.al2023',
    architecture: 'x86_64',
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/',
        method: '*'
      }),
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/{proxy+}',
        method: '*'
      })
    ]
  });

  const build = new LocalScript({
    executeCommand: 'cargo lambda build --release --output-format zip'
  });

  return {
    resources: { apiGateway, api },
    scripts: { build },
    hooks: {
      beforeDeploy: [
        {
          scriptName: 'build'
        }
      ]
    }
  };
});
