import {
  $CfFormat,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  UserAuthPool,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const authPool = new UserAuthPool({
    allowEmailAsUserName: true,
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 8
    },
    enableHostedUi: true,
    hostedUiDomainPrefix: $CfFormat('{stage()}-{projectName()}-auth'),
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid', 'email', 'profile'],
    callbackURLs: ['https://example.com/callback'],
    logoutURLs: ['https://example.com/logout']
  });
  const publicEndpoint = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/public.ts'
    }),
    memory: 512,
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/',
        method: 'GET'
      })
    ]
  });
  const protectedEndpoint = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/protected.ts'
    }),
    memory: 512,
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/me',
        method: 'GET',
        authorizer: {
          type: 'cognito',
          properties: {
            userPoolName: 'authPool'
          }
        }
      })
    ]
  });

  return {
    resources: { apiGateway, authPool, publicEndpoint, protectedEndpoint }
  };
});
