# CloudwatchLogIntegrationProps API Reference

## TypeScript definition

```typescript
type CloudwatchLogIntegrationProps = {
  /** The ARN of the log group to watch for new records. */
  logGroupArn: string;
  /** A filter pattern to apply to the log records. */
  filter?: string;
};
```

## Property: `logGroupArn`

- Required: yes
- Type: `string`

The ARN of the log group to watch for new records.

## Property: `filter`

- Required: no
- Type: `string`

A filter pattern to apply to the log records.

Only logs that match this pattern will trigger the function.
For details on the syntax, see the [AWS documentation on filter and pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
