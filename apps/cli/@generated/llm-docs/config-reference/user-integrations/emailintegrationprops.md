# EmailIntegrationProps API Reference

## TypeScript definition

```typescript
type EmailIntegrationProps = {
  /** The email address of the recipient. */
  recipient: string;
  /** The email address of the sender. */
  sender: string;
};
```

## Property: `recipient`

- Required: yes
- Type: `string`

The email address of the recipient.

### Example 1 (yaml)

```yaml
resources:
  paymentsFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payments.ts
      memory: 512
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 1
          description: Payment processing failures detected
          notificationTargets:
            - type: email
              properties:
                sender: alerts@mycompany.com
                recipient: oncall@mycompany.com
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/payments.ts' }
    },
    memory: 512,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
        description: 'Payment processing failures detected',
        notificationTargets: [
          {
            type: 'email',
            properties: {
              sender: 'alerts@mycompany.com',
              recipient: 'oncall@mycompany.com'
            }
          }
        ]
      }
    ]
  });
  return { resources: { paymentsFunction } };
});
```

## Property: `sender`

- Required: yes
- Type: `string`

The email address of the sender.

### Example 1 (yaml)

```yaml
resources:
  paymentsFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payments.ts
      memory: 512
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 1
          description: Payment processing failures detected
          notificationTargets:
            - type: email
              properties:
                sender: alerts@mycompany.com
                recipient: oncall@mycompany.com
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/payments.ts' }
    },
    memory: 512,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
        description: 'Payment processing failures detected',
        notificationTargets: [
          {
            type: 'email',
            properties: {
              sender: 'alerts@mycompany.com',
              recipient: 'oncall@mycompany.com'
            }
          }
        ]
      }
    ]
  });
  return { resources: { paymentsFunction } };
});
```
