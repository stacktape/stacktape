# UpstashProvider API Reference

## TypeScript definition

```typescript
type UpstashProvider = {
  /** Email address of your Upstash account. */
  accountEmail: string;
  /** API key for your Upstash account. Store as $Secret() for security. */
  apiKey: string;
};
```

## Property: `accountEmail`

- Required: yes
- Type: `string`

Email address of your Upstash account.

### Example 1 (yaml)

```yaml
providerConfig:
  upstash:
    accountEmail: devops@example.com
    apiKey: $Secret('upstashApiKey')

resources:
  cache:
    type: upstash-redis
    properties:
      enableEviction: true
```

### Example 2 (typescript)

```typescript
import { UpstashRedis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new UpstashRedis({ enableEviction: true });
  return {
    providerConfig: {
      upstash: {
        accountEmail: 'devops@example.com',
        apiKey: $Secret('upstashApiKey')
      }
    },
    resources: { cache }
  };
});
```

## Property: `apiKey`

- Required: yes
- Type: `string`

API key for your Upstash account. Store as `$Secret()` for security.

Create an API key in the Upstash console under Account > API Keys.

### Example 1 (yaml)

```yaml
providerConfig:
  upstash:
    accountEmail: devops@example.com
    apiKey: $Secret('upstashApiKey')

resources:
  cache:
    type: upstash-redis
    properties:
      enableEviction: true
```

### Example 2 (typescript)

```typescript
import { UpstashRedis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new UpstashRedis({ enableEviction: true });
  return {
    providerConfig: {
      upstash: {
        accountEmail: 'devops@example.com',
        apiKey: $Secret('upstashApiKey')
      }
    },
    resources: { cache }
  };
});
```
