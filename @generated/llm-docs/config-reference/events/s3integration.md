# S3Integration API Reference

Triggers a function when files are created, deleted, or restored in an S3 bucket.

## TypeScript definition

```typescript
import type { S3IntegrationProps } from 'stacktape';

type S3Integration = {
  properties: S3IntegrationProps;
};
```

## Property: `properties`

- Required: yes
- Type: `S3IntegrationProps`
