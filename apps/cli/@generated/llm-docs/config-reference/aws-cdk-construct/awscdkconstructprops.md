# AwsCdkConstructProps API Reference

Resource type: `aws-cdk-construct`

## TypeScript definition

```typescript
type AwsCdkConstructProps = {
  /** Path to the file containing your CDK construct class. */
  entryfilePath: string;
  /** Custom props passed to the construct's constructor. */
  constructProperties?: unknown;
  /** Name of the exported construct class from the entry file. */
  exportName?: string;
};
```

## Property: `entryfilePath`

- Required: yes
- Type: `string`

Path to the file containing your CDK construct class.

Supports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`.

### Example 1 (yaml)

```yaml
resources:
  notifications:
    type: aws-cdk-construct
    properties:
      entryfilePath: cdk/notification-topic.ts
```

### Example 2 (typescript)

```typescript
import { AwsCdkConstruct, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notifications = new AwsCdkConstruct({
    entryfilePath: 'cdk/notification-topic.ts'
  });
  return { resources: { notifications } };
});
```

## Property: `constructProperties`

- Required: no
- Type: `unknown`

Custom props passed to the construct's constructor.

This object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`
directives here to pass dynamic values from other resources in your stack.

**Example (YAML):**

```yaml
resources:
  notifications:
    type: aws-cdk-construct
    properties:
      entryfilePath: cdk/notification-topic.ts
      constructProperties:
        displayName: Production Alerts
        emailSubscription: $Secret('alerts-email')
```

**Example (TypeScript):**

```ts
import { AwsCdkConstruct, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notifications = new AwsCdkConstruct({
    entryfilePath: 'cdk/notification-topic.ts',
    constructProperties: {
      displayName: 'Production Alerts',
      emailSubscription: $Secret('alerts-email')
    }
  });
  return { resources: { notifications } };
});
```

## Property: `exportName`

- Required: no
- Type: `string`
- Default: `default`

Name of the exported construct class from the entry file.

Must match the exact export name. Use this when the file has multiple exports or uses named exports.

### Example 1 (yaml)

```yaml
resources:
  notifications:
    type: aws-cdk-construct
    properties:
      entryfilePath: cdk/constructs.ts
      exportName: NotificationTopic
```

### Example 2 (typescript)

```typescript
import { AwsCdkConstruct, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notifications = new AwsCdkConstruct({
    entryfilePath: 'cdk/constructs.ts',
    exportName: 'NotificationTopic'
  });
  return { resources: { notifications } };
});
```
