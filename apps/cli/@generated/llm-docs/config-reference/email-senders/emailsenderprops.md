# EmailSenderProps API Reference

## TypeScript definition

```typescript
type EmailSenderProps = {
  /** Domain or email address to verify as an SES sending identity. */
  identity: string;
  /** Existing SES configuration-set name. */
  configurationSetName?: string;
  /** Whether Stacktape owns the SES identity. */
  manageIdentity?: boolean;
};
```

## Property: `identity`

- Required: yes
- Type: `string`

Domain or email address to verify as an SES sending identity.

Use a domain such as `example.com` to send from any address on that domain, or an exact address such as
`billing@example.com` when you only control that mailbox.

## Property: `configurationSetName`

- Required: no
- Type: `string`

Existing SES configuration-set name.

Only applies when `manageIdentity` is `false`. Omit it when applications send without a configuration set.

## Property: `manageIdentity`

- Required: no
- Type: `boolean`
- Default: `true`

Whether Stacktape owns the SES identity.

Keep the default for the simplest setup and automatic reuse between projects and stages. Set this to `false`
only when the identity is managed outside Stacktape.
