import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const prisma = new PrismaClient();

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);

  try {
    const posts = await prisma.post.findMany();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: posts }),
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
