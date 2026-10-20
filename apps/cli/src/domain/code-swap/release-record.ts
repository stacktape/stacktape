import { GetItemCommand, PutItemCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';

export const bundleIdentitySchema = z.strictObject({
  Revision: z.string().min(1),
  Key: z.string().min(1),
  Sha256: z.string().regex(/^[a-f0-9]{64}$/),
  Size: z.number().int().positive()
});
const proposalSchema = bundleIdentitySchema.extend({ Attempt: z.string().min(1) });
export const releaseRecordSchema = z.strictObject({
  Seq: z.number().int().positive(),
  TaskDefinition: z.string().min(1),
  Committed: bundleIdentitySchema.nullable(),
  Proposed: proposalSchema.nullable(),
  HistoryVersion: z.string().nullable(),
  Attempt: z.string().nullable(),
  Phase: z.enum(['prepare', 'commit', 'abort']),
  // The phase 0–3 supervisor fields remain on the wire during the benchmark transition.
  Revision: z.string().optional(),
  Key: z.string().optional(),
  Sha256: z.string().optional(),
  Size: z.number().optional()
});
export type SwapRecord = z.infer<typeof releaseRecordSchema>;
type Client = Pick<DynamoDBClient, 'send'>;

export const readReleaseRecord = async (ddb: Client, table: string): Promise<SwapRecord | undefined> => {
  const { Item } = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: { pk: { S: 'release#node' } },
      ConsistentRead: true
    })
  );
  if (!Item) return;
  const record = releaseRecordSchema.parse(JSON.parse(Item.data!.S!));
  if (Item.seq?.N !== String(record.Seq)) throw new Error('Release record sequence disagrees with its payload.');
  return record;
};

export const writeReleaseRecord = async (
  ddb: Client,
  table: string,
  previous: SwapRecord | undefined,
  next: SwapRecord
) => {
  next = releaseRecordSchema.parse(next);
  if (next.Seq <= (previous?.Seq ?? 0)) throw new Error('Release sequence must strictly increase.');
  const body = JSON.stringify(next);
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: table,
        Item: { pk: { S: 'release#node' }, seq: { N: String(next.Seq) }, data: { S: body } },
        ConditionExpression: previous ? '#seq = :previous' : 'attribute_not_exists(pk)',
        ...(previous
          ? {
              ExpressionAttributeNames: { '#seq': 'seq' },
              ExpressionAttributeValues: { ':previous': { N: String(previous.Seq) } }
            }
          : {})
      })
    );
  } catch (error) {
    // Conditional retry failures do not prove the first write failed. Strong reads also handle SDK retries.
    const stored = await readReleaseRecord(ddb, table);
    if (!stored || JSON.stringify(stored) !== body) throw error;
  }
};

export const interruptedSwapReason = (record: SwapRecord | undefined, attemptOpen: boolean) =>
  record?.Proposed || (record?.Committed && record.HistoryVersion !== record.Committed.Revision) || attemptOpen
    ? 'interrupted_swap_image_repair'
    : undefined;

export const incompleteHistoryVersions = (record: SwapRecord | undefined) =>
  [...new Set([record?.Proposed?.Revision, record?.Committed?.Revision])].filter((version): version is string =>
    Boolean(version && version !== record?.HistoryVersion)
  );

// Keep current bootstrap identity even if image-history retention is configured to zero.
export const obsoleteCodeSwapKeys = (keys: string[], keep: number, currentRevision: string) => {
  const revisionOf = (key: string) => /^code-swap\/api\/(?:bundles|releases|attempts)\/(v\d{6})(?:[-.])/.exec(key)?.[1];
  const revisions = [
    ...new Set(keys.map(revisionOf).filter((revision): revision is string => Boolean(revision)))
  ].sort();
  const retained = new Set([...revisions.slice(-Math.max(1, keep)), currentRevision]);
  return keys.filter((key) => {
    const revision = revisionOf(key);
    return revision && revision < currentRevision && !retained.has(revision);
  });
};

type AttemptStatus = { revision: string; state: string; timings: Record<string, unknown> };
export const allTasksObservedAttempt = (statuses: AttemptStatus[], count: number, revision: string) =>
  statuses.length === count && statuses.every((status) => status.revision === revision);
export const allCandidatesCleaned = (statuses: AttemptStatus[], count: number, revision: string) =>
  allTasksObservedAttempt(statuses, count, revision) &&
  statuses.every(
    (status) =>
      status.state === 'complete' ||
      status.state === 'refused' ||
      (status.timings.candidateReaped === true && ['failed', 'aborted'].includes(status.state))
  );
