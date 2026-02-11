import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_MONITORS_TABLE_NAME!;
const MAX_CHECKS = 10;

const checkUrl = async (url: string): Promise<{ status: 'up' | 'down'; statusCode: number; latencyMs: number }> => {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    return { status: response.ok ? 'up' : 'down', statusCode: response.status, latencyMs: Date.now() - start };
  } catch {
    return { status: 'down', statusCode: 0, latencyMs: Date.now() - start };
  }
};

const handler = async () => {
  const result = await ddb.send(new ScanCommand({ TableName: tableName }));
  const monitors = result.Items || [];

  if (monitors.length === 0) {
    console.log('No monitors configured');
    return { statusCode: 200 };
  }

  console.log(`Checking ${monitors.length} monitors...`);

  for (const monitor of monitors) {
    const check = { ...await checkUrl(monitor.url as string), checkedAt: new Date().toISOString() };
    const existingChecks = (monitor.checks as any[] || []).slice(0, MAX_CHECKS - 1);

    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: monitor.id },
        UpdateExpression: 'SET lastCheck = :lastCheck, checks = :checks',
        ExpressionAttributeValues: {
          ':lastCheck': check,
          ':checks': [check, ...existingChecks]
        }
      })
    );

    console.log(`${monitor.name}: ${check.status} (${check.statusCode}) - ${check.latencyMs}ms`);
  }

  return { statusCode: 200 };
};

export default handler;
