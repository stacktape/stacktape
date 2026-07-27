# CustomKafkaEventSource API Reference

## TypeScript definition

```typescript
import type { KafkaMTLSAuth, KafkaSASLAuth } from 'stacktape';

type CustomKafkaEventSource = {
  /** The authentication method for connecting to the Kafka cluster. */
  authentication: CustomKafkaEventSourceAuthentication;
  /** A list of host:port addresses for your Kafka brokers. */
  bootstrapServers: Array<string>;
  /** The name of the Kafka topic to consume messages from. */
  topicName: string;
};

/** Union choices used by the properties above. */
type CustomKafkaEventSourceAuthentication =
  | KafkaSASLAuth
  | KafkaMTLSAuth;
```

## Property: `authentication`

- Required: yes
- Type: `KafkaSASLAuth | KafkaMTLSAuth`

The authentication method for connecting to the Kafka cluster.

`SASL`: Authenticate using a username and password (PLAIN or SCRAM).
`MTLS`: Authenticate using a client-side TLS certificate.

Choices:
- `KafkaSASLAuth` (`KafkaSASLAuth`). Properties: `authenticationSecretArn: string`.
- `KafkaMTLSAuth` (`KafkaMTLSAuth`). Properties: `clientCertificate: string`, `serverRootCaCertificate?: string`.

## Property: `bootstrapServers`

- Required: yes
- Type: `Array<string>`

A list of `host:port` addresses for your Kafka brokers.

## Property: `topicName`

- Required: yes
- Type: `string`

The name of the Kafka topic to consume messages from.
