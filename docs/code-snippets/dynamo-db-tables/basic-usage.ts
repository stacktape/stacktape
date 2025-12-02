import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDB({});

export default async (event, context) => {
  // Put item to the table
  await dynamoDb.putItem({
    Item: { id: { S: 'my_id_1' }, writeTimestamp: { S: new Date().toLocaleTimeString() } },
    TableName: process.env.TABLE_NAME
  });
  // Get item from the table
  const item = await dynamoDb.getItem({
    Key: { id: { S: 'my_id_1' } },
    TableName: process.env.TABLE_NAME
  });
};
