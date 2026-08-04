# KafkaSASLAuth API Reference

## TypeScript definition

```typescript
import type { KafkaSASLAuthProps } from 'stacktape';

type KafkaSASLAuth = {
  /** Properties of authentication method */
  properties: KafkaSASLAuthProps;
  /** The SASL authentication protocol. */
  type: "BASIC_AUTH" | "SASL_SCRAM_256_AUTH" | "SASL_SCRAM_512_AUTH";
};
```

## Property: `properties`

- Required: yes
- Type: `KafkaSASLAuthProps`

Properties of authentication method

## Property: `type`

- Required: yes
- Type: `string: "BASIC_AUTH" | "SASL_SCRAM_256_AUTH" | "SASL_SCRAM_512_AUTH"`

The SASL authentication protocol.

`BASIC_AUTH`: SASL/PLAIN
`SASL_SCRAM_256_AUTH`: SASL SCRAM-256
`SASL_SCRAM_512_AUTH`: SASL SCRAM-512
