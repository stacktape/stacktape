/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { fixPrismaBinary } from '../utils/fix-prisma-binary';

// @note this is needed because of a prisma-related issue, we can remove this when it's fixed
fixPrismaBinary();
const prisma = new PrismaClient();

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.info(event, context);

  try {
    const posts = await prisma.post.findMany();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
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
