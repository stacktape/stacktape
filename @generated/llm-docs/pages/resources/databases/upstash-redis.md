# Upstash Redis

Upstash Redis is a serverless, pay-per-request Redis database managed by Upstash. Accessible over HTTPS (REST API) or the standard Redis protocol, it fits naturally with [Lambda functions](/resources/compute/lambda-function) and other serverless workloads where persistent connections aren't practical. Stacktape provisions and manages the database as part of your stack.

Upstash Redis uses pay-per-request pricing with no idle costs. See the [Upstash pricing page](https://upstash.com/pricing) for current rates.

## When to use

Upstash Redis is the right choice when your workload is serverless and bursty. Use it for caching, session storage, rate limiting, or lightweight pub/sub in Lambda-based applications. Because pricing is per-request with no idle costs, it avoids the minimum monthly spend of a traditional [Redis cluster](/resources/databases/redis).

Choose Upstash Redis when:

- Your compute is primarily [Lambda functions](/resources/compute/lambda-function) — the HTTPS REST API avoids connection-pooling problems.
- Traffic is unpredictable or low-volume — you pay only for commands you run, not for idle hours.
- You want zero operational overhead — no instance sizing, patching, or replication configuration.
- You need a Redis-compatible store accessible from outside a VPC without bastion tunneling.

## When NOT to use

Upstash Redis is not a drop-in replacement for every Redis workload. Prefer a managed [Redis cluster](/resources/databases/redis) (ElastiCache) when:

- You need the lowest possible latency at high throughput — ElastiCache runs inside your VPC with direct network access, avoiding the overhead of HTTPS or public internet routing.
- Your workload is container-based ([web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service)) with sustained high request rates — per-request pricing becomes expensive compared to per-hour pricing at scale.
- Your application depends on specific Redis commands or Redis module behavior — verify Upstash compatibility before choosing this resource.

| Criteria | Upstash Redis | Redis cluster (ElastiCache) |
|---|---|---|
| Pricing model | Per-request, no idle cost | Per-hour per-node |
| Connection model | HTTPS REST API or standard Redis protocol | Standard Redis protocol (TCP) |
| VPC required | No | Yes |
| Operational overhead | None | Instance sizing, patching, failover config |
| Best for | Serverless / bursty workloads | High-throughput container workloads |

For most Lambda-based projects, Upstash Redis is the better starting point. Switch to ElastiCache if you find yourself running thousands of Redis commands per second sustained — at that volume, ElastiCache's per-hour pricing becomes more cost-effective.

## Provider configuration

Upstash Redis requires `providerConfig.upstash` in your Stacktape config. This provides Stacktape with the credentials to create and manage databases in your Upstash account. You can obtain API credentials from the [Upstash console](https://console.upstash.com).

Use [`$Secret()`](/configuration/directives) to reference the API key instead of hard-coding it in the config file. Create the secret before deploying:

```bash
stacktape secret:create --name upstash-api-key --value YOUR_API_KEY
```


Example (TypeScript):

```typescript
import { defineConfig, UpstashRedis } from 'stacktape';
export default defineConfig(() => {
  const cache = new UpstashRedis({});

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


> **Warning:** Every stack that uses an `upstash-redis` resource must include `providerConfig.upstash`. If you have multiple Upstash Redis resources in the same stack, they all share the same provider credentials — you only configure `providerConfig.upstash` once.


## Basic example

A minimal Upstash Redis resource requires no properties. The only configurable option is [`enableEviction`](#eviction). The example below creates an Upstash Redis database and connects it to a Lambda function using [`connectTo`](/configuration/connecting-resources).


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
    connectTo: ['cache']
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

The `@upstash/redis` npm package wraps the REST API with a Redis-like interface and adds features like automatic retries and pipelining:

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

Use Upstash Redis for serverless and bursty workloads — primarily [Lambda functions](/resources/compute/lambda-function) — where you want pay-per-request pricing and zero operational overhead. Use a [Redis cluster](/resources/databases/redis) (ElastiCache) when your workload is container-based with sustained high throughput or when you need direct in-VPC network access. At low-to-moderate request volume, Upstash is significantly cheaper; at thousands of sustained commands per second, ElastiCache's per-hour pricing becomes more cost-effective.

### What does Upstash Redis cost?

Upstash uses a pay-per-request pricing model with no idle costs — you pay only for the commands you execute. This makes it especially cost-effective for development stages, staging environments, and low-traffic production workloads. Check the [Upstash pricing page](https://upstash.com/pricing) for current rates and plan details.

### How do I connect to Upstash Redis from a Lambda function?

Add the Upstash Redis resource name to your Lambda function's [`connectTo`](/configuration/connecting-resources) list. Stacktape injects environment variables (`STP_[RESOURCE_NAME]_REST_URL`, `STP_[RESOURCE_NAME]_REST_TOKEN`, etc.) into your function. Use the `@upstash/redis` npm package or raw `fetch()` calls against the REST URL — both avoid the connection-pooling issues that traditional Redis clients have in Lambda.

### What environment variables does connectTo inject for Upstash Redis?

When you add an Upstash Redis resource to a workload's `connectTo`, Stacktape injects six environment variables: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, and `REDIS_URL`, each prefixed with `STP_[RESOURCE_NAME]_`. For example, a resource named `cache` produces `STP_CACHE_HOST`, `STP_CACHE_REST_URL`, and so on. Additional parameters like `readOnlyRestToken` are available via [`$ResourceParam()`](/configuration/referenceable-parameters).

### Can I use Upstash Redis for caching and rate limiting?

Yes. Upstash Redis supports standard Redis commands like `SET`, `GET`, `INCR`, `EXPIRE`, and `TTL`, which are the building blocks for caching and rate-limiting algorithms. The `@upstash/ratelimit` npm package provides ready-made implementations (fixed window, sliding window, token bucket) designed for serverless environments. Enable [`enableEviction`](#eviction) for caching workloads so old keys are automatically removed when the database reaches its memory limit.

### Does Upstash Redis run inside my VPC?

No. Upstash Redis is a fully managed third-party service that runs outside your AWS VPC. This means Lambda functions do not need VPC access to reach Upstash Redis, which avoids the cold-start overhead associated with VPC-attached Lambdas. It also means any compute resource — including container workloads and resources outside AWS — can connect without VPC peering or [bastion tunneling](/resources/security/bastion-host).

### How do I store the Upstash API key securely?

Use the [`$Secret()` directive](/configuration/directives) to reference a secret instead of hard-coding it. Create the secret with [`stacktape secret:create`](/cli/secret-create), then reference it in your provider config as `apiKey: '$Secret(upstash-api-key)'`. This keeps the API key out of your config file and version control.

### Can I use Upstash Redis with container workloads?

Yes. Any compute resource that supports [`connectTo`](/configuration/connecting-resources) — including [web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload) — can connect to Upstash Redis. However, container workloads with sustained high throughput are usually better served by a [Redis cluster](/resources/databases/redis) (ElastiCache), which runs inside your VPC and uses per-hour pricing that becomes cheaper at scale.

### Should I use the REST API or the Redis protocol?

For Lambda functions, use the REST API (via `@upstash/redis` or raw `fetch()`). It avoids persistent TCP connections that don't fit Lambda's ephemeral execution model and can exhaust connection limits under concurrency. For container workloads with long-lived processes, either approach works — the standard Redis protocol with a client like `ioredis` may be simpler if your codebase already uses Redis client libraries.
