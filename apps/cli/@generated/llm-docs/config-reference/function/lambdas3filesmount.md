# LambdaS3FilesMount API Reference

Resource type: `function`

## TypeScript definition

```typescript
import type { LambdaS3FilesMountProps } from 'stacktape';

type LambdaS3FilesMount = {
  /** Properties for the S3 Files volume mount. */
  properties: LambdaS3FilesMountProps;
};
```

## Property: `properties`

- Required: yes
- Type: `LambdaS3FilesMountProps`

Properties for the S3 Files volume mount.

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
        properties: { accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap', mountPath: '/mnt/s3data' }
      }
    ]
  });
  return { resources: { datasetReader } };
});
```
