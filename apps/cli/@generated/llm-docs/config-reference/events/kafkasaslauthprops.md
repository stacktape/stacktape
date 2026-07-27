# KafkaSASLAuthProps API Reference

## TypeScript definition

```typescript
type KafkaSASLAuthProps = {
  /** The ARN of a secret containing the Kafka credentials. */
  authenticationSecretArn: string;
};
```

## Property: `authenticationSecretArn`

- Required: yes
- Type: `string`

The ARN of a secret containing the Kafka credentials.

The secret must be a JSON object with `username` and `password` keys.
You can create secrets using the `stacktape secret:create` command.
