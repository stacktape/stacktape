import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_CONVERSATIONS_NAME!;

type Message = { role: 'user' | 'assistant'; content: string };

export const loadConversation = async (conversationId: string): Promise<Message[]> => {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'conversationId = :id',
      ExpressionAttributeValues: { ':id': conversationId },
      ScanIndexForward: true
    })
  );
  return (result.Items || []).map((item) => ({ role: item.role, content: item.content }));
};

export const saveMessage = async (conversationId: string, role: string, content: string) => {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: { conversationId, timestamp: new Date().toISOString(), role, content }
    })
  );
};
