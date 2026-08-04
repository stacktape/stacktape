# DestinationOnFailure API Reference

## TypeScript definition

```typescript
type DestinationOnFailure = {
  /** The ARN of the SNS topic or SQS queue for failed batches. */
  arn: string;
  /** The type of the destination. */
  type: "sns" | "sqs";
};
```

## Property: `arn`

- Required: yes
- Type: `string`

The ARN of the SNS topic or SQS queue for failed batches.

## Property: `type`

- Required: yes
- Type: `string: "sns" | "sqs"`

The type of the destination.
