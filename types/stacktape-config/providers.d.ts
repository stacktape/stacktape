interface MongoDbAtlasProvider {
  /**
   * #### Your MongoDB Atlas public API key.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     # stp-focus
   *     publicKey: abcdef12
   *     # stp-end-focus
   *     privateKey: $Secret('mongoDbAtlasPrivateKey')
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *
   * resources:
   *   appDatabase:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         // stp-focus
   *         publicKey: 'abcdef12',
   *         // stp-end-focus
   *         privateKey: $Secret('mongoDbAtlasPrivateKey'),
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
   *       }
   *     },
   *     resources: { appDatabase }
   *   };
   * });
   * ```
   */
  publicKey?: string;
  /**
   * #### Your MongoDB Atlas private API key. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     publicKey: abcdef12
   *     # stp-focus
   *     privateKey: $Secret('mongoDbAtlasPrivateKey')
   *     # stp-end-focus
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *
   * resources:
   *   appDatabase:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         publicKey: 'abcdef12',
   *         // stp-focus
   *         privateKey: $Secret('mongoDbAtlasPrivateKey'),
   *         // stp-end-focus
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
   *       }
   *     },
   *     resources: { appDatabase }
   *   };
   * });
   * ```
   */
  privateKey?: string;
  /**
   * #### Your MongoDB Atlas Organization ID.
   *
   * ---
   *
   * Found in the MongoDB Atlas console under Organization Settings.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     publicKey: abcdef12
   *     privateKey: $Secret('mongoDbAtlasPrivateKey')
   *     # stp-focus
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *     # stp-end-focus
   *
   * resources:
   *   appDatabase:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         publicKey: 'abcdef12',
   *         privateKey: $Secret('mongoDbAtlasPrivateKey'),
   *         // stp-focus
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
   *         // stp-end-focus
   *       }
   *     },
   *     resources: { appDatabase }
   *   };
   * });
   * ```
   */
  organizationId?: string;
  /**
   * #### Network connectivity settings for all MongoDB Atlas clusters in this stack.
   *
   * ---
   *
   * Stacktape auto-creates a MongoDB Atlas Project for your clusters. These accessibility settings
   * apply at the project level — all clusters in the stack share the same network config.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     publicKey: abcdef12
   *     privateKey: $Secret('mongoDbAtlasPrivateKey')
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *     # stp-focus
   *     accessibility:
   *       accessibilityMode: scoping-workloads-in-vpc
   *       whitelistedIps:
   *         - 203.0.113.4/32
   *     # stp-end-focus
   *
   * resources:
   *   appDatabase:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         publicKey: 'abcdef12',
   *         privateKey: $Secret('mongoDbAtlasPrivateKey'),
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
   *         // stp-focus
   *         accessibility: {
   *           accessibilityMode: 'scoping-workloads-in-vpc',
   *           whitelistedIps: ['203.0.113.4/32']
   *         }
   *         // stp-end-focus
   *       }
   *     },
   *     resources: { appDatabase }
   *   };
   * });
   * ```
   */
  accessibility?: MongoDbAtlasAccessibility;
}

interface MongoDbAtlasApiCredentials {
  /**
   * #### Your MongoDB Atlas public API key.
   */
  publicKey: string;
  /**
   * #### Your MongoDB Atlas private API key.
   */
  privateKey: string;
}

interface UpstashProvider {
  /**
   * #### Email address of your Upstash account.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   upstash:
   *     # stp-focus
   *     accountEmail: devops@example.com
   *     # stp-end-focus
   *     apiKey: $Secret('upstashApiKey')
   *
   * resources:
   *   cache:
   *     type: upstash-redis
   *     properties:
   *       enableEviction: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UpstashRedis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new UpstashRedis({ enableEviction: true });
   *   return {
   *     providerConfig: {
   *       upstash: {
   *         // stp-focus
   *         accountEmail: 'devops@example.com',
   *         // stp-end-focus
   *         apiKey: $Secret('upstashApiKey')
   *       }
   *     },
   *     resources: { cache }
   *   };
   * });
   * ```
   */
  accountEmail: string;
  /**
   * #### API key for your Upstash account. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create an API key in the Upstash console under Account > API Keys.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   upstash:
   *     accountEmail: devops@example.com
   *     # stp-focus
   *     apiKey: $Secret('upstashApiKey')
   *     # stp-end-focus
   *
   * resources:
   *   cache:
   *     type: upstash-redis
   *     properties:
   *       enableEviction: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UpstashRedis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new UpstashRedis({ enableEviction: true });
   *   return {
   *     providerConfig: {
   *       upstash: {
   *         accountEmail: 'devops@example.com',
   *         // stp-focus
   *         apiKey: $Secret('upstashApiKey')
   *         // stp-end-focus
   *       }
   *     },
   *     resources: { cache }
   *   };
   * });
   * ```
   */
  apiKey: string;
}
