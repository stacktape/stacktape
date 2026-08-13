# KafkaTopicIntegration API Reference

Triggers a function when new messages are available in a Kafka topic.

## TypeScript definition

```typescript
type KafkaTopicIntegration = {
  properties: KafkaTopicIntegrationProperties;
};

/** Union choices used by the properties above. */
type KafkaTopicIntegrationProperties =
  | "option-1"
  | "option-2"
  | "option-3";
```

## Property: `properties`

- Required: yes
- Type: `option-1 | option-2 | option-3`

Choices:
- `option-1`. Properties: `kafkaClusterName: string`, `topicName: string`, `startFrom: string: "earliest" | "latest"`, `batchSize?: number`, `maxBatchWindowSeconds?: number`, `consumerGroupId?: string`.
- `option-2`. Properties: `mskClusterArn: string`, `topicName: string`, `startFrom: string: "earliest" | "latest"`, `batchSize?: number`, `maxBatchWindowSeconds?: number`, `consumerGroupId?: string`.
- `option-3`. Properties: `customKafkaConfiguration: CustomKafkaEventSource`, `vpc?: KafkaEventSourceVpcConfig`, `startFrom: string: "earliest" | "latest"`, `batchSize?: number`, `maxBatchWindowSeconds?: number`, `consumerGroupId?: string`.
