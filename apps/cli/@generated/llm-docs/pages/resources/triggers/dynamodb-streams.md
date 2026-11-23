# DynamoDB streams

A `dynamo-db-stream` event runs a [Lambda function](/resources/compute/lambda-function) when items in a
[DynamoDB table](/resources/databases/dynamodb) are created, updated or deleted. Use it to keep an audit log, update a
search index or cache, or notify another system after a write, without changing the code that writes.

The table's stream keeps changes for 24 hours and allows two readers per shard. To fan changes out to many consumers,
have one function forward them to an [event bus](/resources/triggers/event-bus-events) or a
[Kinesis stream](/resources/triggers/kinesis-events). Batch jobs accept `dynamo-db-stream` events too.

## Basic example

Turn on the table's stream with `streamType`, then pass its ARN to the trigger:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  DynamoDbIntegration,
  $ResourceParam,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    },
    streamType: 'NEW_AND_OLD_IMAGES'
  });

  const streamProcessor = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/process-stream.ts'
    }),
    events: [
      new DynamoDbIntegration({
        streamArn: $ResourceParam('ordersTable', 'streamArn')
      })
    ]
  });

  return {
    resources: { ordersTable, streamProcessor }
  };
});
```


The table has a `streamArn` parameter only when `streamType` is set. For a table outside the stack, pass its stream ARN
as a string; the function's role gets read access to that stream.

`streamType` decides what each record contains:

| `streamType` | Record contains |
|---|---|
| `KEYS_ONLY` | The item's key |
| `NEW_IMAGE` | The item after the change |
| `OLD_IMAGE` | The item before the change |
| `NEW_AND_OLD_IMAGES` | Both, for diffs and audit logs |

Each record has an `eventName` (`INSERT`, `MODIFY` or `REMOVE`) and the images in DynamoDB's attribute format
(`{ S: 'hello' }`). `unmarshall` from `@aws-sdk/util-dynamodb` turns them into plain objects:

```typescript
import { unmarshall } from '@aws-sdk/util-dynamodb';

export default async (event: { Records: Array<{ eventName: string; dynamodb: { NewImage?: any; OldImage?: any } }> }) => {
  for (const record of event.Records) {
    const before = record.dynamodb.OldImage && unmarshall(record.dynamodb.OldImage);
    const after = record.dynamodb.NewImage && unmarshall(record.dynamodb.NewImage);
    console.info(record.eventName, before, after);
  }
};
```

After `stacktape deploy`, write an item and read the function's logs. AWS can take a minute or two to start polling a
new trigger.

```bash
aws dynamodb put-item --table-name <table-name> --item '{"id":{"S":"order-1"}}'
```

```bash
stacktape logs streamProcessor --stage dev
```

`stacktape param get ordersTable name --stage dev --region eu-west-1` prints the table name.

`startingPosition` is `TRIM_HORIZON` by default: on the first deploy the function reads every change still in the
stream. Set `LATEST` to read only changes made after the trigger exists.

## Batching and ordering

Lambda invokes the function when the batch is full, when the batching window ends, or when the batch reaches the 6 MB
invocation payload limit.

| Property | Default | Maximum |
|---|---|---|
| `batchSize` | 100 | 10,000 |
| `maxBatchWindowSeconds` | 0 (no wait) | 300 |
| `parallelizationFactor` | 1 | 10 |

Changes to the same item always arrive in the order they were made. With `parallelizationFactor` above 1, Lambda
processes up to 10 batches per shard at the same time. Changes to one item stay in order, but changes to different
items can be processed in any order.

Lambda reads DynamoDB streams for free. You pay for the function's invocations and run time, so a larger `batchSize` or
a batching window lowers the bill on busy tables.

## Failures and retries

If the function throws, Lambda retries the whole batch, including records it already processed, and doesn't move past
it. By default it keeps retrying until the records expire after 24 hours, and the shard waits behind them. Make the
handler idempotent, for example by keying writes on the item key, and give the trigger a way out:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  DynamoDbIntegration,
  SqsQueue,
  $ResourceParam,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } },
    streamType: 'NEW_AND_OLD_IMAGES'
  });
  const failedChanges = new SqsQueue({});

  const streamProcessor = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/process-stream.ts' }),
    events: [
      new DynamoDbIntegration({
        streamArn: $ResourceParam('ordersTable', 'streamArn'),
        maximumRetryAttempts: 3,
        bisectBatchOnFunctionError: true,
        onFailure: { arn: $ResourceParam('failedChanges', 'arn'), type: 'sqs' }
      })
    ]
  });

  return { resources: { ordersTable, failedChanges, streamProcessor } };
});
```


- `maximumRetryAttempts` stops retrying a batch after this many attempts.
- `bisectBatchOnFunctionError` splits a failing batch in two before each retry, which narrows it down to the bad record.
- `reportBatchItemFailures: true` lets the handler return `{ batchItemFailures: [{ itemIdentifier }] }` with the
  sequence number of the first record it couldn't process. Lambda retries from that record instead of the whole batch.
- `onFailure` names an SQS queue or SNS topic for batches that still fail.

The `onFailure` destination receives a description of the failed batch, not the changes: the shard, the sequence number
range and the error. You can read the records from the stream by sequence number until they expire 24 hours after the
write. If you need the changed items kept longer, have the handler save failed records to S3 or a queue itself.

## Dev mode

In [dev mode](/local-development/dev-mode-overview), DynamoDB tables normally run locally in DynamoDB Local, which has
no stream Lambda can read. When a function has a stream trigger, `stacktape dev` deploys that table in the dev stack
instead and says so when it starts. Your local code then reads and writes the deployed table with the permissions its
`connectTo` grants.

A function left out with `--skip-resources` has no triggers in the dev stack. The table stays deployed, so skipping
the function doesn't delete the table or its data.

## Configuration reference


### Definition: `DynamoDbIntegrationProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/events` with definition name `DynamoDbIntegrationProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `streamArn` | yes | `string` | - |
| `batchSize` | no | `number` | `100` |
| `bisectBatchOnFunctionError` | no | `boolean` | - |
| `maxBatchWindowSeconds` | no | `number` | - |
| `maximumRetryAttempts` | no | `number` | - |
| `onFailure` | no | `DestinationOnFailure` | - |
| `parallelizationFactor` | no | `number` | - |
| `reportBatchItemFailures` | no | `boolean` | `false` |
| `startingPosition` | no | `string` | `TRIM_HORIZON` |


## Next steps

- [DynamoDB](/resources/databases/dynamodb): keys, indexes and capacity of the table.
- [Kinesis events](/resources/triggers/kinesis-events): ordered streams with longer retention and more consumers.
- [Lambda function](/resources/compute/lambda-function): memory, timeout and logs of the consumer.
