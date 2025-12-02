import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProvider({});

(async () => {
  const event = JSON.parse(process.env.STP_TRIGGER_EVENT_DATA);
  const userData = await cognito.getUser({ AccessToken: event.headers.authorization });
  // do something with your user data
})();
