# Upstash Redis

Upstash Redis is a serverless, pay-per-request Redis database managed by Upstash. Accessible over HTTPS (REST API) or the standard Redis protocol, it fits naturally with [Lambda functions](/resources/compute/lambda-function) and other serverless workloads where persistent connections aren't practical. Stacktape provisions and manages the database as part of your stack.

Upstash Redis uses pay-per-request pricing with no idle costs. See the [Upstash pricing page](https://upstash.com/pricing) for current rates.

## When to use

Upstash Redis is the right choice when your workload is serverless and bursty. Use it for caching, session storage, or rate limiting in Lambda-based applications. Because pricing is per-request with no idle costs, it avoids the minimum monthly spend of a traditional [Redis cluster](/resources/databases/redis).

Choose Upstash Redis when:

- Your compute is primarily [Lambda functions](/resources/compute/lambda-function) — the HTTPS REST API avoids connection-pooling problems.
- Traffic is unpredictable or low-volume — you pay only for commands you run, not for idle hours.
- You want a serverless resource with minimal configuration — `UpstashRedisProps` exposes only `enableEviction`; instance sizing, patching, and replication are not configured through Stacktape.
- You need a Redis-compatible store that does not require VPC configuration.

## When NOT to use

Upstash Redis is not a drop-in replacement for every Redis workload. Prefer a managed [Redis cluster](/resources/databases/redis) (ElastiCache) when:

- You need the lowest possible latency at high throughput — ElastiCache runs inside your VPC with direct network access, avoiding the overhead of HTTPS or public internet routing.
- Your workload is container-based ([web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service)) with sustained high request rates — per-request pricing becomes expensive compared to per-hour pricing at scale.
- Your application depends on Redis features beyond what Upstash supports — check the Upstash documentation for supported commands before choosing this resource.

| Criteria | Upstash Redis | Redis cluster (ElastiCache) |
|---|---|---|
| Pricing model | Per-request, no idle cost | Per-hour per-node |
| Connection model | HTTPS REST API or standard Redis protocol | Standard Redis protocol (TCP) |
| VPC required | No | Yes |
| Stacktape configuration surface | Only `enableEviction` | Instance sizing, patching, failover config |
| Best for | Serverless / bursty workloads | High-throughput container workloads |

For most Lambda-based projects, Upstash Redis is the better starting point. Switch to ElastiCache when sustained high-throughput workloads make per-request pricing more expensive than ElastiCache's per-hour pricing.

## Provider configuration

Upstash Redis requires `providerConfig.upstash` in your Stacktape config. This block supplies your Upstash account credentials so Stacktape can provision and manage the database on your behalf. See the [basic example](#basic-example) below for the shape of the block.

Use the [`$Secret()` directive](/configuration/directives) to reference sensitive credential values instead of hard-coding them in the config file. Create secrets with [`stacktape secret:set`](/cli/secret-set) before deploying.


> **Warning:** Every stack that uses an `upstash-redis` resource must include `providerConfig.upstash`. If you have multiple Upstash Redis resources in the same stack, they all share the same provider credentials — you only configure `providerConfig.upstash` once.


## Basic example

The `UpstashRedis` constructor can be called with an empty object — the only configurable property is [`enableEviction`](#eviction). However, the stack must still include `providerConfig.upstash` whenever it contains an Upstash Redis resource. The example below creates an Upstash Redis database and connects it to a Lambda function using [`connectTo`](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  UpstashRedis,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const cache = new UpstashRedis({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [cache]
  });

  return {
    providerConfig: {
      upstash: {
        accountEmail: 'you@company.com',
        apiKey: '$Secret(upstash-api-key)'
      }
    },
    resources: { cache, api }
  };
});
```


The `api` Lambda function uses [`connectTo`](/configuration/connecting-resources) to reference the `cache` resource. Stacktape automatically injects environment variables with connection details into the function — see [Connecting from workloads](#connecting-from-workloads) below.

The `providerConfig.upstash` block at the top of the returned config is required whenever the stack contains an `upstash-redis` resource — see [Provider configuration](#provider-configuration) above for details on the credential values.

## Eviction

By default, Upstash Redis does not evict keys — writes fail when the database reaches its memory limit. For caching workloads where losing old data is acceptable, set `enableEviction` to `true`. When enabled, Upstash prioritizes keys with TTL set.


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
        apiKey: '$Secret(upstash-api-key)'
      }
    },
    resources: { cache }
  };
});
```


**When to enable:** the database is used as a cache or for transient data like sessions and rate-limit counters. Keys with a TTL are evicted first, so set a TTL on cache entries to control what gets removed.

**When to leave disabled (default):** every key matters and you want writes to fail explicitly rather than silently discard data. This is the safer default for session stores or queues where data loss is unacceptable.

## Connecting from workloads

Use [`connectTo`](/configuration/connecting-resources) to give a compute resource access to your Upstash Redis database. Stacktape injects environment variables with connection details into the consuming workload. Any resource that supports `connectTo` — including [Lambda functions](/resources/compute/lambda-function), [web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload) — can connect this way.

For a resource named `cache`, the following environment variables are injected:

| Environment variable | Description |
|---|---|
| `STP_CACHE_HOST` | Redis host endpoint |
| `STP_CACHE_PORT` | Redis port |
| `STP_CACHE_PASSWORD` | Database password |
| `STP_CACHE_REST_TOKEN` | Token for the Upstash REST API |
| `STP_CACHE_REST_URL` | URL for the Upstash REST API |
| `STP_CACHE_REDIS_URL` | Redis connection URL |

Variable names follow the pattern `STP_[RESOURCE_NAME]_[PARAM]`, where the resource name is converted to SCREAMING_SNAKE_CASE. A resource named `sessionStore` produces `STP_SESSION_STORE_HOST`, `STP_SESSION_STORE_REST_URL`, and so on.

### Using the REST API

The Upstash REST API lets you run Redis commands over HTTPS without a persistent connection or Redis client library. This is the recommended approach for [Lambda functions](/resources/compute/lambda-function), because it avoids the connection-pooling problems that traditional Redis clients have in Lambda's ephemeral execution model.

You can call the REST API directly with `fetch()`:

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

The `@upstash/redis` npm package wraps the REST API with a Redis-like TypeScript interface:

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

Upstash Redis also supports the standard Redis protocol. Use the `STP_CACHE_REDIS_URL` environment variable with any Redis client library like `ioredis`:

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.STP_CACHE_REDIS_URL!);

export const handler = async () => {
  await redis.set('key', 'value');
  const result = await redis.get('key');
  return { statusCode: 200, body: JSON.stringify({ result }) };
};
```


> **Tip:** For Lambda functions, prefer the REST API or `@upstash/redis` over a traditional Redis client. Traditional clients open persistent TCP connections that don't map well to Lambda's ephemeral execution model and can exhaust connection limits under high concurrency.


## Referenceable parameters

Use [`$ResourceParam()`](/configuration/referenceable-parameters) to reference Upstash Redis parameters in other parts of your config — for example, to pass the host or REST URL as an environment variable to a resource that doesn't support `connectTo`.


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


## API Reference


## API Reference: `UpstashRedisProps`
```typescript
type UpstashRedisProps = {
  /** Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases. */
  enableEviction?: boolean;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `enableEviction` | no | `boolean` | Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases. Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads. | `false` |


## FAQ

### When should I use Upstash Redis vs a Redis cluster (ElastiCache)?

Use Upstash Redis for serverless and bursty workloads — primarily [Lambda functions](/resources/compute/lambda-function) — where you want pay-per-request pricing and minimal configuration (the resource exposes only `enableEviction`). Use a [Redis cluster](/resources/databases/redis) (ElastiCache) when your workload is container-based with sustained high throughput or when you need direct in-VPC network access. At low-to-moderate request volume, Upstash is significantly cheaper; at sustained high throughput, ElastiCache's per-hour pricing becomes more cost-effective.

### What does Upstash Redis cost?

Upstash uses a pay-per-request pricing model with no idle costs — you pay only for the commands you execute. This makes it especially cost-effective for development stages, staging environments, and low-traffic production workloads. Check the [Upstash pricing page](https://upstash.com/pricing) for current rates and plan details.

### How do I connect to Upstash Redis from a Lambda function?

Add the Upstash Redis resource name to your Lambda function's [`connectTo`](/configuration/connecting-resources) list. Stacktape injects environment variables (`STP_[RESOURCE_NAME]_REST_URL`, `STP_[RESOURCE_NAME]_REST_TOKEN`, etc.) into your function. Use the `@upstash/redis` npm package or raw `fetch()` calls against the REST URL — both avoid the connection-pooling issues that traditional Redis clients have in Lambda.

### Does Upstash Redis run inside my VPC?

No. Upstash Redis is a third-party managed service that runs outside your AWS VPC. This means Lambda functions do not need VPC access to reach Upstash Redis. Any compute resource that supports [`connectTo`](/configuration/connecting-resources) can connect to it without VPC configuration.

### Should I use the REST API or the Redis protocol?

For Lambda functions, use the REST API (via `@upstash/redis` or raw `fetch()`). It avoids persistent TCP connections that don't fit Lambda's ephemeral execution model and can exhaust connection limits under concurrency. For container workloads with long-lived processes, either approach works — the standard Redis protocol with a client like `ioredis` may be simpler if your codebase already uses Redis client libraries.

### Why does my deploy fail without providerConfig.upstash?

Every stack that contains an `upstash-redis` resource must include a [`providerConfig.upstash`](#provider-configuration) block with your Upstash account credentials — this is how Stacktape provisions the database on your behalf. You configure it once per stack even if you have multiple Upstash Redis resources, since they all share the same provider credentials. Use the [`$Secret()` directive](/configuration/directives) for the `apiKey` instead of hard-coding it.
