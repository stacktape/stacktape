import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_TICKETS_NAME!;

export const handler = async (event: any) => {
  const input = event.input || event;
  const ticketId = `ticket-${Date.now().toString(36)}`;
  const item = {
    ticketId,
    customerId: input.customerId,
    priority: input.priority || 'normal',
    summary: input.summary,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: item
    })
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(item)
      }
    ]
  };
};
