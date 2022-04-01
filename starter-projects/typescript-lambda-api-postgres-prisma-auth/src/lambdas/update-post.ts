import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '../services/prisma';

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);

  try {
    const requestBody = JSON.parse(event.body);
    const id = Number(event.pathParameters.id);

    const { createdAt, updatedAt, ...existingPostData } = await prisma.post.findUnique({
      where: { id },
    });

    const updatedPost = await prisma.post.update({
      data: { ...existingPostData, ...requestBody },
      where: { id },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: updatedPost }),
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
