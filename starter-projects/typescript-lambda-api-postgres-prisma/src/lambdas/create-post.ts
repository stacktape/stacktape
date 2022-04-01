import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '../services/prisma';

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);

  try {
    const requestBody = JSON.parse(event.body);

    const postData = await prisma.post.create({
      data: {
        title: requestBody.title,
        content: requestBody.content,
        authorEmail: requestBody.authorEmail,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: postData }),
    };
  } catch (error) {
    console.error(error);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      body: JSON.stringify({ message: 'error', error: error.message }),
    };
  }
};

export default handler;
