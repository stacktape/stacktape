import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ECSClient } from '@aws-sdk/client-ecs';
import { z } from 'zod';
import { Allocator, InvalidRequest, type StoppedEvent } from './allocator';

const allocator = new Allocator(process.env.CAPACITY_TABLE!, new DynamoDBClient({}), new ECSClient({}));
const streamSchema = z.object({
  Records: z.array(
    z.object({
      eventID: z.string(),
      eventName: z.string(),
      dynamodb: z.object({
        SequenceNumber: z.string(),
        Keys: z.object({ pk: z.object({ S: z.string() }) }),
        NewImage: z.record(z.string(), z.unknown()).optional()
      })
    })
  )
});
const stoppedSchema = z.object({
  source: z.string(),
  'detail-type': z.string(),
  account: z.string(),
  region: z.string(),
  detail: z.object({ lastStatus: z.string(), taskArn: z.string(), clusterArn: z.string(), group: z.string() })
});
export const handleCapacityEvent = async (allocator: Allocator, input: unknown) => {
  const stopped = stoppedSchema.safeParse(input);
  if (stopped.success) {
    await allocator.stopped(stopped.data as StoppedEvent);
    return;
  }
  const event = streamSchema.parse(input);
  const batchItemFailures: { itemIdentifier: string }[] = [];
  await Promise.all(
    event.Records.map(async (record) => {
      if (record.eventName === 'REMOVE' || !record.dynamodb.NewImage?.capacityRequest) return;
      try {
        const request = z
          .object({ S: z.string() })
          .safeParse(record.dynamodb.NewImage.capacityRequestedAt ?? record.dynamodb.NewImage.capacityRequest);
        const rawMs = request.success ? Number(request.data.S) : NaN;
        const requestedAtMs = Number.isFinite(rawMs) && rawMs > 0 ? rawMs : undefined;
        const grant = await allocator.allocate(record.dynamodb.Keys.pk.S, requestedAtMs);
        console.log(
          JSON.stringify({
            benchmarkEvent: 'capacityAdmission',
            atMs: Date.now(),
            owner: record.dynamodb.Keys.pk.S,
            outcome: grant ? 'granted' : 'refused',
            slot: grant?.slot,
            token: grant?.token,
            requestedAtMs: grant?.requestedAtMs ?? requestedAtMs
          })
        );
      } catch (error) {
        if (error instanceof InvalidRequest) {
          // Log a bounded category, never task-supplied attributes. A malformed
          // record is discarded; it must not hold valid requests behind retries.
          console.error(
            JSON.stringify({
              _aws: {
                Timestamp: Date.now(),
                CloudWatchMetrics: [
                  {
                    Namespace: 'Stacktape/CodeSwap/Capacity',
                    Dimensions: [['FunctionName']],
                    Metrics: [{ Name: 'InvalidRequests', Unit: 'Count' }]
                  }
                ]
              },
              FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'local',
              InvalidRequests: 1,
              capacityFault: 'invalid_request'
            })
          );
        } else batchItemFailures.push({ itemIdentifier: record.dynamodb.SequenceNumber });
      }
    })
  );
  return { batchItemFailures };
};

export const handler = (input: unknown) => handleCapacityEvent(allocator, input);
