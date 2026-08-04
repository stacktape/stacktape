# LambdaS3FilesMountProps API Reference

Resource type: `function`

## TypeScript definition

```typescript
type LambdaS3FilesMountProps = {
  /** ARN of an existing S3 Files access point. */
  accessPointArn: unknown;
  /** Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/s3data`). */
  mountPath: string;
};
```

## Property: `accessPointArn`

- Required: yes
- Type: `unknown`

ARN of an existing S3 Files access point.

**Example (YAML):**

```yaml
resources:
  datasetReader:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/read.ts
      joinDefaultVpc: true
      volumeMounts:
        - type: s3files
          properties:
            accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
            mountPath: /mnt/s3data
```

**Example (TypeScript):**

```ts
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const datasetReader = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
    joinDefaultVpc: true,
    volumeMounts: [
      {
        type: 's3files',
        properties: {
          accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap',
          mountPath: '/mnt/s3data'
        }
      }
    ]
  });
  return { resources: { datasetReader } };
});
```

## Property: `mountPath`

- Required: yes
- Type: `string`

Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/s3data`).

### Example 1 (yaml)

```yaml
resources:
  datasetReader:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/read.ts
      joinDefaultVpc: true
      volumeMounts:
        - type: s3files
          properties:
            accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
            mountPath: /mnt/s3data
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const datasetReader = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
    joinDefaultVpc: true,
    volumeMounts: [
      {
        type: 's3files',
        properties: {
          accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap',
          mountPath: '/mnt/s3data'
        }
      }
    ]
  });
  return { resources: { datasetReader } };
});
```
