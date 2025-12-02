# Basic usage

```yaml
providerConfig:
  upstash:
    accountEmail: xxxxx.yyyy@example.com
    apiKey: $Secret('upstash-api-key')

resources:
  # {start-highlight}
  myUpstash:
    type: upstash-redis
  # {stop-highlight}

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/upstash.ts
      environment:
        - name: UPSTASH_REDIS_REST_URL
          value: $ResourceParam('myUpstash', 'restUrl')
        - name: UPSTASH_REDIS_REST_TOKEN
          value: $ResourceParam('myUpstash', 'restToken')
```

```typescript
import upstash from '@upstash/redis';

const redis = upstash({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async (event) => {
  // write data
  let { data, error } = await redis.set('key1', 'value1');

  // read data
  ({ data, error } = await redis.get('key1'));
  console.log(data);

  if (error) {
    throw error;
  }
};
```

> The code for the `myFunction` function.