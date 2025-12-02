import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProvider({});

const handler = async (event, context) => {
  const userData = await cognito.getUser({ AccessToken: event.headers.authorization });
  // do something with your user data
};

export default handler;
