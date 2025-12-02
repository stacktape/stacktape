# Enable eviction

```yaml
providerConfig:
  upstash:
    accountEmail: xxxxx.yyyy@example.com
    apiKey: $Secret('upstash-api-key')

resources:
  myUpstash:
    type: upstash-redis
    properties:
      # {start-highlight}
      enableEviction: true
      # {stop-highlight}
```