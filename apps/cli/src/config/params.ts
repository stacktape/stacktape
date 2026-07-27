import { IS_DEV } from './random';

export const STACKTAPE_TRPC_API_ENDPOINT =
  process.env.STP_CUSTOM_TRPC_API_ENDPOINT || (IS_DEV ? 'https://dev-api.stacktape.com' : 'https://api.stacktape.com');

export const COGNITO_CONFIG = IS_DEV
  ? {
      region: 'eu-west-1',
      userPoolId: 'eu-west-1_ud8t7U0RB',
      clientId: '6nsdmota4cm2u6c806mh7cljb',
      domain: 'dev-login.stacktape.com'
    }
  : {
      region: 'eu-west-1',
      userPoolId: 'eu-west-1_4JTubfhFV',
      clientId: '4tvjqvh6daabn343mu371ienuc',
      domain: 'login.stacktape.com'
    };
