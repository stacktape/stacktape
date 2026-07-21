# S3IntegrationProps API Reference

## TypeScript definition

```typescript
import type { S3FilterRule } from 'stacktape';

type S3IntegrationProps = {
  /** The ARN of the S3 bucket to monitor for events. */
  bucketArn: string;
  /** The type of S3 event that will trigger the function. */
  s3EventType: "s3:ObjectCreated:*" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Put" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Post" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationNotTracked" | "s3:Replication:OperationReplicatedAfterThreshold";
  /** A filter to apply to objects, so the function is only triggered for relevant objects. */
  filterRule?: S3FilterRule;
};
```

## Property: `bucketArn`

- Required: yes
- Type: `string`

The ARN of the S3 bucket to monitor for events.

## Property: `s3EventType`

- Required: yes
- Type: `string: "s3:ObjectCreated:*" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Put" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Post" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationNotTracked" | "s3:Replication:OperationReplicatedAfterThreshold"`

The type of S3 event that will trigger the function.

## Property: `filterRule`

- Required: no
- Type: `S3FilterRule`

A filter to apply to objects, so the function is only triggered for relevant objects.
