# KafkaEventSourceVpcConfig API Reference

## TypeScript definition

```typescript
type KafkaEventSourceVpcConfig = {
  /** Security-group IDs attached to Lambda's Kafka poller network interfaces. */
  securityGroupIds: Array<string>;
  /** Subnet IDs through which Lambda's poller can reach the brokers. Multi-AZ placement is recommended. */
  subnetIds: Array<string>;
};
```

## Property: `securityGroupIds`

- Required: yes
- Type: `Array<string>`

Security-group IDs attached to Lambda's Kafka poller network interfaces.

## Property: `subnetIds`

- Required: yes
- Type: `Array<string>`

Subnet IDs through which Lambda's poller can reach the brokers. Multi-AZ placement is recommended.
