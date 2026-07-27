# KafkaMTLSAuthProps API Reference

## TypeScript definition

```typescript
type KafkaMTLSAuthProps = {
  /** The ARN of a secret containing the client certificate. */
  clientCertificate: string;
  /** The ARN of a secret containing the server&#39;s root CA certificate. */
  serverRootCaCertificate?: string;
};
```

## Property: `clientCertificate`

- Required: yes
- Type: `string`

The ARN of a secret containing the client certificate.

This secret should contain the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password.
You can create secrets using the `stacktape secret:create` command.

## Property: `serverRootCaCertificate`

- Required: no
- Type: `string`

The ARN of a secret containing the server's root CA certificate.

You can create secrets using the `stacktape secret:create` command.
