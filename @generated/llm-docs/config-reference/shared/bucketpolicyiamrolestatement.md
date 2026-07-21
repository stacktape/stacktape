# BucketPolicyIamRoleStatement API Reference

## TypeScript definition

```typescript
type BucketPolicyIamRoleStatement = {
  Principal: unknown;
  /** ARNs of the AWS resources this statement applies to. Use "*" for all resources. */
  Resource: Array<string>;
  /** AWS actions to allow or deny (e.g., s3:GetObject, sqs:SendMessage). */
  Action?: Array<string>;
  /** Conditions under which this statement applies (e.g., IP restrictions, tag-based access). */
  Condition?: unknown;
  /** Whether to allow or deny the specified actions. */
  Effect?: string;
  /** Optional identifier for this statement (for readability). */
  Sid?: string;
};
```

## Property: `Principal`

- Required: yes
- Type: `unknown`

## Property: `Resource`

- Required: yes
- Type: `Array<string>`

ARNs of the AWS resources this statement applies to. Use `"*"` for all resources.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      iamRoleStatements:
        - Resource:
            - '*'
          Action:
            - rekognition:DetectLabels
            - rekognition:DetectText
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    iamRoleStatements: [
      {
        Resource: ['*'],
        Action: ['rekognition:DetectLabels', 'rekognition:DetectText']
      }
    ]
  });

  return { resources: { api } };
});
```

## Property: `Action`

- Required: no
- Type: `Array<string>`

AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).

## Property: `Condition`

- Required: no
- Type: `unknown`

Conditions under which this statement applies (e.g., IP restrictions, tag-based access).

**Example (YAML):**

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      iamRoleStatements:
        - Effect: Allow
          Action:
            - s3:GetObject
          Resource:
            - 'arn:aws:s3:::my-secure-bucket/*'
          Condition:
            Bool:
              'aws:SecureTransport': 'true'
```

**Example (TypeScript):**

```ts
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::my-secure-bucket/*'],
        Condition: { Bool: { 'aws:SecureTransport': 'true' } }
      }
    ]
  });

  return { resources: { api } };
});
```

## Property: `Effect`

- Required: no
- Type: `string`
- Default: `Allow`

Whether to allow or deny the specified actions.

## Property: `Sid`

- Required: no
- Type: `string`

Optional identifier for this statement (for readability).

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      iamRoleStatements:
        - Sid: AllowBedrockInvoke
          Effect: Allow
          Action:
            - bedrock:InvokeModel
          Resource:
            - 'arn:aws:bedrock:*::foundation-model/*'
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    iamRoleStatements: [
      {
        Sid: 'AllowBedrockInvoke',
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel'],
        Resource: ['arn:aws:bedrock:*::foundation-model/*']
      }
    ]
  });

  return { resources: { api } };
});
```
