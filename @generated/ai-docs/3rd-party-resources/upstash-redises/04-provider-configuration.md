# Provider configuration

To use Upstash with Stacktape, you will need to:

1.  Create an [Upstash account](https://console.upstash.com/login).
2.  Get your API key from the [Upstash console](https://console.upstash.com/account/api).
3.  Store your credentials (the email address for your Upstash account and your API key) in a [secret](../../security-resources/secrets//index.md).

```yaml
# {start-highlight}
providerConfig:
  upstash:
    accountEmail: xxxxx.yyyy@example.com
    apiKey: $Secret('upstash-api-key')
# {stop-highlight}

resources:
  myUpstash:
    type: upstash-redis
```