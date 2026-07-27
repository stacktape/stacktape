import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const auditTable = process.env.STP_AUDIT_TABLE_NAME!;

type DynamoDBStreamRecord = {
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  dynamodb: {
    Keys: Record<string, { S?: string; N?: string }>;
    NewImage?: Record<string, any>;
    OldImage?: Record<string, any>;
  };
};

const unmarshallSimple = (image: Record<string, any> | undefined) => {
  if (!image) return undefined;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(image)) {
    if ('S' in value) result[key] = value.S;
    else if ('N' in value) result[key] = Number(value.N);
    else if ('BOOL' in value) result[key] = value.BOOL;
    else if ('NULL' in value) result[key] = null;
    else result[key] = JSON.stringify(value);
  }
  return result;
};

const handler = async (event: { Records: DynamoDBStreamRecord[] }) => {
  for (const record of event.Records) {
    const keys = unmarshallSimple(record.dynamodb.Keys);
    const entityId = keys?.id || 'unknown';

    await ddb.send(
      new PutCommand({
        TableName: auditTable,
        Item: {
          entityId,
          timestamp: new Date().toISOString(),
          action: record.eventName,
          oldImage: unmarshallSimple(record.dynamodb.OldImage),
          newImage: unmarshallSimple(record.dynamodb.NewImage)
        }
      })
    );

    console.log(`Audit: ${record.eventName} on ${entityId}`);
  }

  return { statusCode: 200 };
};

export default handler;
