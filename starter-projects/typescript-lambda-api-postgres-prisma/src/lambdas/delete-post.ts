import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '../services/prisma';

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);
  const id = Number(event.pathParameters.id);

  try {
    const deletedPost = await prisma.post.delete({ where: { id } });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: deletedPost }),
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
