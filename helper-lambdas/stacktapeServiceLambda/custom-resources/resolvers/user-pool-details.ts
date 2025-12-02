import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const userPoolDetails: ServiceLambdaResolver<StpServiceCustomResourceProperties['userPoolDetails']> = async (
  currentProps,
  _previousProps,
  operation,
  _physicalResourceId
) => {
  let ClientSecret: string;
  if (operation !== 'Delete') {
    console.info(`Getting user pool (${currentProps.userPoolId}) client (${currentProps.userPoolClientId}) details...`);

    const { UserPoolClient } = await client.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: currentProps.userPoolId as string,
        ClientId: currentProps.userPoolClientId as string
      })
    );

    console.info(JSON.stringify(UserPoolClient, null, 2));

    ClientSecret = UserPoolClient.ClientSecret;

    console.info(
      `Getting user pool (${currentProps.userPoolId}) client (${currentProps.userPoolClientId}) details - SUCCESS`
    );
  }
  return { data: { ClientSecret }, physicalResourceId: `${currentProps.userPoolClientId}-details` };
};
