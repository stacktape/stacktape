# Upstash Redis

Upstash Redis is a serverless Redis database run by Upstash, outside your AWS account. Your code reaches it over HTTPS
(the REST API) or the Redis protocol, so [Lambda functions](/resources/compute/lambda-function) need no VPC and no
connection pool. Stacktape creates the database through your Upstash account.

You pay Upstash, per command: $0.20 per 100,000 commands, plus $0.25 per GB-month of stored data after the first GB
([Upstash pricing](https://upstash.com/pricing/redis)). An idle database costs only its storage. For high, steady
traffic from containers, a [Redis cache](/resources/databases/redis) in your VPC is faster and cheaper per request.

## Provider configuration

Stacktape needs your Upstash account email and an Upstash API key, created in the Upstash console under
**Account → Management API**. Store the key as a [secret](/configuration/secrets):

```bash
stacktape secret set upstash-api-key
```

Then reference it in `providerConfig.upstash`, once per stack, as in the example below. You can also save the
credentials once on the **Third-party providers** page of the [Console](/stacktape-console/console-overview).

## Basic example


Example (TypeScript):

```typescript
import {
  defineConfig,
  UpstashRedis,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const cache = new UpstashRedis({});

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [cache]
  });

  return {
    providerConfig: {
      upstash: {
        accountEmail: 'you@company.com',
        apiKey: "$Secret('upstash-api-key')"
      }
    },
    resources: { cache, api }
  };
});
```


The deploy creates a database in the Upstash region closest to your stack's region (Upstash offers us-east-1,
us-west-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1, ap-southeast-2 and sa-east-1). `connectTo` gives the
function the connection variables listed in [Connecting from workloads](#connecting-from-workloads).

## Eviction

By default, Upstash keeps every key, and writes fail when the database is full. For a cache, set `enableEviction: true`
so Upstash removes keys to make room, starting with keys that have a TTL.


Example (TypeScript):

```typescript
import { defineConfig, UpstashRedis } from 'stacktape';
export default defineConfig(() => {
  const cache = new UpstashRedis({
    enableEviction: true
  });

  return {
    providerConfig: {
      upstash: {
        accountEmail: 'you@company.com',
        apiKey: "$Secret('upstash-api-key')"
      }
    },
    resources: { cache }
  };
});
```


Leave it off when every key matters, for example for sessions you can't lose or counters.

## Connecting from workloads

Add the database to a workload's [`connectTo`](/configuration/connecting-resources). For a database named `cache`, the
workload gets:

| Variable | Value |
|---|---|
| `STP_CACHE_REST_URL` | REST API URL |
| `STP_CACHE_REST_TOKEN` | REST token with full access |
| `STP_CACHE_READ_ONLY_REST_TOKEN` | REST token that can only read |
| `STP_CACHE_REDIS_URL` | Redis protocol URL, with the password |
| `STP_CACHE_HOST`, `STP_CACHE_PORT`, `STP_CACHE_PASSWORD` | Redis protocol parts |

Give code that only reads the read-only token.

### Using the REST API

The REST API needs no client library and no open connection, which suits Lambda functions:

```typescript
export const handler = async () => {
  const restUrl = process.env.STP_CACHE_REST_URL;
  const restToken = process.env.STP_CACHE_REST_TOKEN;

  await fetch(`${restUrl}/set/greeting/hello`, {
    headers: { Authorization: `Bearer ${restToken}` }
  });

  const response = await fetch(`${restUrl}/get/greeting`, {
    headers: { Authorization: `Bearer ${restToken}` }
  });
  const data = await response.json();

  return { statusCode: 200, body: JSON.stringify(data) };
};
```

The `@upstash/redis` package wraps it in a Redis-like client:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.STP_CACHE_REST_URL!,
  token: process.env.STP_CACHE_REST_TOKEN!
});

export const handler = async () => {
  await redis.set('greeting', 'hello');
  const value = await redis.get('greeting');
  return { statusCode: 200, body: JSON.stringify({ value }) };
};
```

### Using the Redis protocol

Long-running containers can use any Redis client with `STP_CACHE_REDIS_URL`:

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.STP_CACHE_REDIS_URL!);

await redis.set('key', 'value');
const result = await redis.get('key');
```

In Lambda functions, each concurrent invocation opens its own TCP connection, which can exhaust the database's
connection limit. Use the REST API there.

## Configuration reference


### Definition: `UpstashRedisProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/upstash-redis` with definition name `UpstashRedisProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `enableEviction` | no | `boolean` | `false` |


## Referenceable parameters

Use [`$ResourceParam()`](/configuration/referenceable-parameters) to reference Upstash Redis parameters in other parts of your config, for example to pass the host or REST URL as an environment variable to a resource that doesn't support `connectTo`.


## Referenceable Parameters: `upstash-redis`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `host` | Hostname (address) of the Upstash Redis database. | `$ResourceParam("<<resource-name>>", "host")` |
| `port` | Port of the Upstash Redis database. | `$ResourceParam("<<resource-name>>", "port")` |
| `password` | Autogenerated password that can be used to authenticate towards the database. | `$ResourceParam("<<resource-name>>", "password")` |
| `restToken` | Rest token which can be used when reading/writing from/to the database using the REST API | `$ResourceParam("<<resource-name>>", "restToken")` |
| `readOnlyRestToken` | Rest token which can be used only for reading from the database using the REST API | `$ResourceParam("<<resource-name>>", "readOnlyRestToken")` |
| `restUrl` | Rest URL which can be used when communicating with the database using the REST API | `$ResourceParam("<<resource-name>>", "restUrl")` |
| `redisUrl` | Standard redis url (including password) which can be used for connecting using cli. | `$ResourceParam("<<resource-name>>", "redisUrl")` |
