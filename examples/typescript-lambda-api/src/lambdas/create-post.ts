import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PostModel } from '../db-models';
import { syncDbModel } from '../utils/sequelize';

let isModelSynchronized = false;

export const handler: APIGatewayProxyHandlerV2 = async (event, _context) => {
  if (!isModelSynchronized) {
    await syncDbModel();
    isModelSynchronized = true;
  }

  const requestData = JSON.parse(event.body);
  const createdPost = await PostModel.create({
    title: requestData.title,
    content: requestData.content
  });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createdPost)
  };
};
