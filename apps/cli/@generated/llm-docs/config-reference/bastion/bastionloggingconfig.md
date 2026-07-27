# BastionLoggingConfig API Reference

Resource type: `bastion`

## TypeScript definition

```typescript
import type { BastionLogging } from 'stacktape';

type BastionLoggingConfig = {
  /** Audit logs (/var/log/audit/audit.log) — detailed security events from the Linux audit system. */
  audit?: BastionLogging;
  /** System messages (/var/log/messages) — startup info, kernel messages, service logs. */
  messages?: BastionLogging;
  /** Auth logs (/var/log/secure) — SSH login attempts, authentication events. */
  secure?: BastionLogging;
};
```

## Property: `audit`

- Required: no
- Type: `BastionLogging`
- Default: `retentionDays: 365`

Audit logs (`/var/log/audit/audit.log`) — detailed security events from the Linux audit system.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        audit:
          retentionDays: 731
        secure:
          retentionDays: 180
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      audit: { retentionDays: 731 },
      secure: { retentionDays: 180 }
    }
  });
  return { resources: { bastion } };
});
```

## Property: `messages`

- Required: no
- Type: `BastionLogging`
- Default: `retentionDays: 30`

System messages (`/var/log/messages`) — startup info, kernel messages, service logs.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        messages:
          retentionDays: 14
        secure:
          retentionDays: 180
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      messages: { retentionDays: 14 },
      secure: { retentionDays: 180 }
    }
  });
  return { resources: { bastion } };
});
```

## Property: `secure`

- Required: no
- Type: `BastionLogging`
- Default: `retentionDays: 180`

Auth logs (`/var/log/secure`) — SSH login attempts, authentication events.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        secure:
          retentionDays: 365
        messages:
          retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      secure: { retentionDays: 365 },
      messages: { retentionDays: 30 }
    }
  });
  return { resources: { bastion } };
});
```
