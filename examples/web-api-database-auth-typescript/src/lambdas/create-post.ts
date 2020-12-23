/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { fixPrismaBinary } from '../utils/fix-prisma-binary';

// @note this is needed because of a prisma-related issue, we can remove this when it's fixed
fixPrismaBinary();
const prisma = new PrismaClient();
const cognitoClient = new CognitoIdentityProvider({});

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);

  try {
    const postData = JSON.parse(event.body);
    const userData = await cognitoClient.getUser({ AccessToken: event.headers.authorization });

    const { id } = await prisma.post.create({
      data: {
        title: postData.title,
        content: postData.content,
        authorEmail: userData.UserAttributes.find((attr) => attr.Name === 'email').Value
      }
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id })
    };
  } catch (error) {
    console.error(error);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      error: error.message
    };
  }
};

export default handler;
