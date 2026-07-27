/**
 * #### Serverless Redis by Upstash — pay-per-request with no idle costs.
 *
 * ---
 *
 * Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
 * Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.
 */
interface UpstashRedis {
  type: 'upstash-redis';
  properties?: UpstashRedisProps;
  overrides?: ResourceOverrides;
}

type StpUpstashRedis = UpstashRedis['properties'] & {
  name: string;
  type: UpstashRedis['type'];
  configParentResourceType: UpstashRedis['type'];
  nameChain: string[];
};

interface UpstashRedisProps {
  /**
   * #### Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.
   *
   * ---
   *
   * Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: upstash-redis
   *     properties:
   *       # stp-focus
   *       enableEviction: true
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - cache
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UpstashRedis, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new UpstashRedis({
   *     // stp-focus
   *     enableEviction: true
   *     // stp-end-focus
   *   });
   *
   *   const api = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     connectTo: [cache]
   *   });
   *
   *   return { resources: { cache, api } };
   * });
   * ```
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # stp-focus
   * resources:
   *   sessionStore:
   *     type: upstash-redis
   *     properties:
   *       enableEviction: false
   * # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       environment:
   *         - name: REDIS_URL
   *           value: $ResourceParam('sessionStore', 'redisUrl')
   *         - name: REDIS_REST_URL
   *           value: $ResourceParam('sessionStore', 'restUrl')
   *         - name: REDIS_REST_TOKEN
   *           value: $ResourceParam('sessionStore', 'restToken')
   *       connectTo:
   *         - sessionStore
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UpstashRedis, LambdaFunction, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   // stp-focus
   *   const sessionStore = new UpstashRedis({
   *     enableEviction: false
   *   });
   *   // stp-end-focus
   *
   *   const api = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     environment: {
   *       REDIS_URL: $ResourceParam('sessionStore', 'redisUrl'),
   *       REDIS_REST_URL: $ResourceParam('sessionStore', 'restUrl'),
   *       REDIS_REST_TOKEN: $ResourceParam('sessionStore', 'restToken')
   *     },
   *     connectTo: [sessionStore]
   *   });
   *
   *   return { resources: { sessionStore, api } };
   * });
   * ```
   *
   * @default false
   */
  enableEviction?: boolean;
}

type UpstashRedisReferencableParam =
  | 'host'
  | 'port'
  | 'password'
  | 'restToken'
  | 'readOnlyRestToken'
  | 'restUrl'
  | 'redisUrl';
