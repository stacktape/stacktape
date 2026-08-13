# DsqlDatabaseProps API Reference

Resource type: `dsql-database`

## TypeScript definition

```typescript
type DsqlDatabaseProps = {
  /** Prevent the cluster from being deleted. */
  deletionProtection?: boolean;
  /** ARN of a customer-managed KMS key used to encrypt the cluster. */
  kmsKeyArn?: string;
};
```

## Property: `deletionProtection`

- Required: no
- Type: `boolean`
- Default: `false`

Prevent the cluster from being deleted.

Enable this for production data. You must disable it before intentionally removing the resource.

DSQL does not create automatic backups, point-in-time recovery, or a final snapshot through this resource, so a
deletion can be irreversible unless you configured AWS Backup separately.

## Property: `kmsKeyArn`

- Required: no
- Type: `string`

ARN of a customer-managed KMS key used to encrypt the cluster.

Omit this to use an AWS-owned key, which is the simplest choice for most applications. Supplying your own key
gives you control over its policy and lifecycle, and makes keeping that key available your responsibility.
