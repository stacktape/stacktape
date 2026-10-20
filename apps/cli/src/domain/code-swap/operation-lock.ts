// Benchmark-only exclusion. Replace this with the general release guard when that work lands.
import { DeleteItemCommand, GetItemCommand, PutItemCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';
import { CliError } from '../../utils/errors';

const holderSchema = z.strictObject({
  invocationId: z.string().min(1),
  operation: z.enum(['deploy', 'rollback', 'delete']),
  startedAt: z.iso.datetime()
});
export type LockHolder = z.infer<typeof holderSchema>;
type Client = Pick<DynamoDBClient, 'send'>;
const key = { pk: { S: 'lock' } };

export const tableGoneDuringDelete = (error: unknown, operation: LockHolder['operation'], stackStatus?: string) =>
  operation === 'delete' &&
  ['DELETE_IN_PROGRESS', 'DELETE_FAILED'].includes(stackStatus) &&
  error instanceof Error &&
  error.name === 'ResourceNotFoundException';

export const readLock = async (ddb: Client, table: string): Promise<LockHolder | undefined> => {
  const { Item } = await ddb.send(new GetItemCommand({ TableName: table, Key: key, ConsistentRead: true }));
  return Item ? holderSchema.parse(JSON.parse(Item.data!.S!)) : undefined;
};

export const removeLock = async (ddb: Client, table: string, invocationId: string) => {
  try {
    await ddb.send(
      new DeleteItemCommand({
        TableName: table,
        Key: key,
        ConditionExpression: 'holder = :holder',
        ExpressionAttributeValues: { ':holder': { S: invocationId } }
      })
    );
  } catch (error) {
    if (await readLock(ddb, table)) throw error;
  }
};

export const acquireLock = async (ddb: Client, table: string, holder: LockHolder) => {
  holderSchema.parse(holder);
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: table,
        Item: { ...key, holder: { S: holder.invocationId }, data: { S: JSON.stringify(holder) } },
        ConditionExpression: 'attribute_not_exists(pk)'
      })
    );
  } catch (error) {
    // A lost successful response may be retried and fail its condition. Read before deciding.
    const existing = await readLock(ddb, table);
    if (existing?.invocationId === holder.invocationId) return;
    if (!existing) throw error;
    throw new CliError({
      category: 'DEPLOYMENT',
      code: 'CODE_SWAP_OPERATION_BUSY',
      message: `Another ${existing.operation} operation (${existing.invocationId}, started ${existing.startedAt}) holds the code-swap lock. No change was made.`,
      hints: `Wait for it to finish. If it stopped, make sure its AWS changes finished, then run again with --recoverOperation ${existing.invocationId}.`
    });
  }
};

export const recoverLock = async (ddb: Client, table: string, invocationId: string) => {
  const holder = await readLock(ddb, table);
  if (!holder) return;
  if (holder.invocationId !== invocationId)
    throw new CliError({
      category: 'DEPLOYMENT',
      code: 'CODE_SWAP_RECOVERY_OWNER_MISMATCH',
      message: `Lock belongs to ${holder.invocationId}, not ${invocationId}. Nothing was recovered.`
    });
  await removeLock(ddb, table, invocationId);
};
