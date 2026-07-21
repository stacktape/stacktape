# BucketAccessibility API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { BucketPolicyIamRoleStatement } from 'stacktape';

type BucketAccessibility = {
  /** Configures pre-defined accessibility modes for the bucket. */
  accessibilityMode: "private" | "public-read" | "public-read-write";
  /** Advanced access configuration that leverages IAM policy statements. */
  accessPolicyStatements?: Array<BucketPolicyIamRoleStatement>;
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "private" | "public-read" | "public-read-write"`
- Default: `private`

Configures pre-defined accessibility modes for the bucket.

This allows you to easily configure the most common access patterns.

Available modes:

`public-read-write`: Everyone can read from and write to the bucket.
`public-read`: Everyone can read from the bucket. Only compute resources and entities with sufficient IAM permissions can write to it.
`private` (default): Only compute resources and entities with sufficient IAM permissions can read from or write to the bucket.

For functions, batch jobs, and container workloads, you can grant the required IAM permissions using the `allowsAccessTo` or `iamRoleStatements` properties in their respective configurations.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      accessibility:
        accessibilityMode: public-read
      cors:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    accessibility: {
      accessibilityMode: 'public-read'
    },
    cors: {
      enabled: true
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `accessPolicyStatements`

- Required: no
- Type: `Array<BucketPolicyIamRoleStatement>`

Advanced access configuration that leverages IAM policy statements.

This gives you fine-grained access control over the bucket.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      accessibility:
        accessibilityMode: private
        accessPolicyStatements:
          - Effect: Allow
            Principal: '*'
            Action:
              - 's3:GetObject'
            Resource:
              - $Format('{}/public/*', $ResourceParam('myBucket', 'arn'))
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig, $ResourceParam, $CfFormat } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    accessibility: {
      accessibilityMode: 'private',
      accessPolicyStatements: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [$CfFormat('{}/public/*', $ResourceParam('myBucket', 'arn'))]
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```
