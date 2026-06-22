/**
 * #### S3 storage bucket for files, images, backups, or any binary data.
 *
 * ---
 *
 * Pay only for what you store and transfer. Highly durable (99.999999999%).
 */
interface Bucket {
  type: 'bucket';
  properties?: BucketProps;
  overrides?: ResourceOverrides;
}

type SupportedHeaderPreset =
  | 'gatsby-static-website'
  | 'static-website'
  | 'single-page-app'
  | 'astro-static-website'
  | 'sveltekit-static-website'
  | 'nuxt-static-website';

interface DirectoryUpload {
  /**
   * #### Path to the local directory to upload (relative to project root).
   *
   * ---
   *
   * The bucket will mirror this directory exactly — existing files not in the directory are deleted.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         # stp-focus
   *         directoryPath: ./build
   *         # stp-end-focus
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       // stp-focus
   *       directoryPath: './build'
   *       // stp-end-focus
   *     },
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  directoryPath: string;
  /**
   * #### Set HTTP headers or tags on files matching specific patterns.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         # stp-focus
   *         fileOptions:
   *           - includePattern: '*.html'
   *             headers:
   *               - key: Cache-Control
   *                 value: no-cache
   *         # stp-end-focus
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       // stp-focus
   *       fileOptions: [
   *         {
   *           includePattern: '*.html',
   *           headers: [{ key: 'Cache-Control', value: 'no-cache' }]
   *         }
   *       ]
   *       // stp-end-focus
   *     },
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Glob patterns for files to skip during upload (relative to `directoryPath`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         # stp-focus
   *         excludeFilesPatterns:
   *           - '**\/*.map'
   *           - '.DS_Store'
   *         # stp-end-focus
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       // stp-focus
   *       excludeFilesPatterns: ['**\/*.map', '.DS_Store']
   *       // stp-end-focus
   *     },
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  excludeFilesPatterns?: string[];
  // /**
  //  * #### Configures which files should be included during upload (glob patterns).
  //  * ---
  //  * - Relative to the `directoryPath`
  //  * - If you do not specify this property, all the files/folders in the directory are included(uploaded).
  //  * - If a file matches both a pattern from `skipFiles` and `includeFiles` properties, then file is not uploaded (`skipFiles` takes precedence over `includeFiles`)
  //  */
  // includeFiles?: string[];
  /**
   * #### Preset for HTTP caching headers, optimized for your frontend framework.
   *
   * ---
   *
   * - **`single-page-app`**: HTML never cached, hashed assets cached forever. For React/Vue/Angular SPAs.
   * - **`static-website`**: CDN-cached, never browser-cached. For generic static sites.
   * - **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**: Framework-specific
   *   caching (hashed build assets cached forever, HTML always fresh).
   *
   * Override individual files with `fileOptions`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         # stp-focus
   *         headersPreset: single-page-app
   *         # stp-end-focus
   *       cdn:
   *         enabled: true
   *         rewriteRoutesForSinglePageApp: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       // stp-focus
   *       headersPreset: 'single-page-app'
   *       // stp-end-focus
   *     },
   *     cdn: {
   *       enabled: true,
   *       rewriteRoutesForSinglePageApp: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  headersPreset?: SupportedHeaderPreset;
  /**
   * #### Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         # stp-focus
   *         disableS3TransferAcceleration: true
   *         # stp-end-focus
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       // stp-focus
   *       disableS3TransferAcceleration: true
   *       // stp-end-focus
   *     },
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   *
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}

interface KeyValuePair {
  /**
   * #### Key
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *           - includePattern: 'assets/**'
   *             headers:
   *                 # stp-focus
   *               - key: Cache-Control
   *                 # stp-end-focus
   *                 value: 'public, max-age=31536000, immutable'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           includePattern: 'assets/**',
   *           headers: [
   *             {
   *               // stp-focus
   *               key: 'Cache-Control',
   *               // stp-end-focus
   *               value: 'public, max-age=31536000, immutable'
   *             }
   *           ]
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  key: string;
  /**
   * #### Value
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *           - includePattern: 'assets/**'
   *             headers:
   *               - key: Cache-Control
   *                 # stp-focus
   *                 value: 'public, max-age=31536000, immutable'
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           includePattern: 'assets/**',
   *           headers: [
   *             {
   *               key: 'Cache-Control',
   *               // stp-focus
   *               value: 'public, max-age=31536000, immutable'
   *               // stp-end-focus
   *             }
   *           ]
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  value: string;
}

interface DirectoryUploadFilter {
  /**
   * #### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *             # stp-focus
   *           - includePattern: '*.html'
   *             # stp-end-focus
   *             headers:
   *               - key: Cache-Control
   *                 value: no-cache
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           // stp-focus
   *           includePattern: '*.html',
   *           // stp-end-focus
   *           headers: [{ key: 'Cache-Control', value: 'no-cache' }]
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  includePattern: string;
  /**
   * #### Glob pattern for files to exclude even if they match `includePattern`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *           - includePattern: 'assets/**'
   *             # stp-focus
   *             excludePattern: 'assets/uncompressed/**'
   *             # stp-end-focus
   *             headers:
   *               - key: Cache-Control
   *                 value: 'public, max-age=31536000, immutable'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           includePattern: 'assets/**',
   *           // stp-focus
   *           excludePattern: 'assets/uncompressed/**',
   *           // stp-end-focus
   *           headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  excludePattern?: string;
  /**
   * #### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *           - includePattern: 'assets/**'
   *             # stp-focus
   *             headers:
   *               - key: Cache-Control
   *                 value: 'public, max-age=31536000, immutable'
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           includePattern: 'assets/**',
   *           // stp-focus
   *           headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  headers?: KeyValuePair[];
  /**
   * #### Tags for matching files. Can be used to target files with `lifecycleRules`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         fileOptions:
   *           - includePattern: 'reports/**'
   *             # stp-focus
   *             tags:
   *               - key: category
   *                 value: report
   *             # stp-end-focus
   *       lifecycleRules:
   *         - type: expiration
   *           properties:
   *             tags:
   *               - key: category
   *                 value: report
   *             daysAfterUpload: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       fileOptions: [
   *         {
   *           includePattern: 'reports/**',
   *           // stp-focus
   *           tags: [{ key: 'category', value: 'report' }]
   *           // stp-end-focus
   *         }
   *       ]
   *     },
   *     lifecycleRules: [
   *       {
   *         type: 'expiration',
   *         properties: {
   *           tags: [{ key: 'category', value: 'report' }],
   *           daysAfterUpload: 30
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  tags?: KeyValuePair[];
}

interface BucketProps {
  /**
   * #### Sync a local directory to this bucket on every deploy.
   *
   * ---
   *
   * > **Warning:** Replaces all existing bucket contents. Don't use for buckets
   * > with user-uploaded or application-generated files.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       directoryUpload:
   *         directoryPath: ./dist
   *       # stp-end-focus
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     // stp-focus
   *     directoryUpload: {
   *       directoryPath: './dist'
   *     },
   *     // stp-end-focus
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  directoryUpload?: DirectoryUpload;
  /**
   * #### Who can read/write to this bucket: `private` (default), `public-read`, or `public-read-write`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       accessibility:
   *         accessibilityMode: public-read
   *       # stp-end-focus
   *       versioning: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     accessibility: {
   *       accessibilityMode: 'public-read'
   *     },
   *     // stp-end-focus
   *     versioning: true
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  accessibility?: BucketAccessibility;
  /**
   * #### CORS settings for browser-based access to the bucket.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       cors:
   *         enabled: true
   *       # stp-end-focus
   *       accessibility:
   *         accessibilityMode: public-read
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     cors: {
   *       enabled: true
   *     },
   *     // stp-end-focus
   *     accessibility: {
   *       accessibilityMode: 'public-read'
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  cors?: BucketCorsConfig;
  /**
   * #### Keep previous versions of overwritten/deleted objects. Helps recover from mistakes.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       versioning: true
   *       # stp-end-focus
   *       encryption: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     versioning: true,
   *     // stp-end-focus
   *     encryption: true
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  versioning?: boolean;
  /**
   * #### Encrypt stored objects at rest (AES-256).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       encryption: true
   *       # stp-end-focus
   *       versioning: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     encryption: true,
   *     // stp-end-focus
   *     versioning: true
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  encryption?: boolean;
  /**
   * #### Auto-delete or move objects to cheaper storage classes over time.
   *
   * ---
   *
   * Use to control storage costs: expire old files, archive infrequently accessed data,
   * or clean up incomplete uploads.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       lifecycleRules:
   *         - type: expiration
   *           properties:
   *             daysAfterUpload: 90
   *       # stp-end-focus
   *       versioning: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     lifecycleRules: [
   *       {
   *         type: 'expiration',
   *         properties: {
   *           daysAfterUpload: 90
   *         }
   *       }
   *     ],
   *     // stp-end-focus
   *     versioning: true
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  lifecycleRules?: (
    | Expiration
    | NonCurrentVersionExpiration
    | ClassTransition
    | NonCurrentVersionClassTransition
    | AbortIncompleteMultipartUpload
  )[];
  /**
   * #### Send events (object created, deleted, etc.) to EventBridge for event-driven workflows.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       enableEventBusNotifications: true
   *       # stp-end-focus
   *       versioning: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     enableEventBusNotifications: true,
   *     // stp-end-focus
   *     versioning: true
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   *
   * @default false
   */
  enableEventBusNotifications?: boolean;
  /**
   * #### Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       cdn:
   *         enabled: true
   *         cloudfrontPriceClass: PriceClass_100
   *       # stp-end-focus
   *       directoryUpload:
   *         directoryPath: ./public
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     // stp-focus
   *     cdn: {
   *       enabled: true,
   *       cloudfrontPriceClass: 'PriceClass_100'
   *     },
   *     // stp-end-focus
   *     directoryUpload: {
   *       directoryPath: './public'
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  cdn?: BucketCdnConfiguration;
}

type StpBucket = Bucket['properties'] & {
  name: string;
  type: Bucket['type'];
  configParentResourceType:
    | Bucket['type']
    | HostingBucket['type']
    | NextjsWeb['type']
    | AstroWeb['type']
    | NuxtWeb['type']
    | SvelteKitWeb['type']
    | SolidStartWeb['type']
    | TanStackWeb['type']
    | RemixWeb['type']
    | Convex['type'];
  nameChain: string[];
};

interface BucketAccessibility {
  /**
   * #### Configures pre-defined accessibility modes for the bucket.
   *
   * ---
   *
   * This allows you to easily configure the most common access patterns.
   *
   * Available modes:
   * - `public-read-write`: Everyone can read from and write to the bucket.
   * - `public-read`: Everyone can read from the bucket. Only compute resources and entities with sufficient IAM permissions can write to it.
   * - `private` (default): Only compute resources and entities with sufficient IAM permissions can read from or write to the bucket.
   *
   * For functions, batch jobs, and container workloads, you can grant the required IAM permissions using the `allowsAccessTo` or `iamRoleStatements` properties in their respective configurations.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       accessibility:
   *         # stp-focus
   *         accessibilityMode: public-read
   *         # stp-end-focus
   *       cors:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     accessibility: {
   *       // stp-focus
   *       accessibilityMode: 'public-read'
   *       // stp-end-focus
   *     },
   *     cors: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   *
   * @default private
   */
  accessibilityMode: 'private' | 'public-read-write' | 'public-read';
  /**
   * #### Advanced access configuration that leverages IAM policy statements.
   *
   * ---
   *
   * This gives you fine-grained access control over the bucket.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       accessibility:
   *         accessibilityMode: private
   *         # stp-focus
   *         accessPolicyStatements:
   *           - Effect: Allow
   *             Principal: '*'
   *             Action:
   *               - 's3:GetObject'
   *             Resource:
   *               - $Format('{}/public/*', $ResourceParam('myBucket', 'arn'))
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig, $ResourceParam, $CfFormat } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     accessibility: {
   *       accessibilityMode: 'private',
   *       // stp-focus
   *       accessPolicyStatements: [
   *         {
   *           Effect: 'Allow',
   *           Principal: '*',
   *           Action: ['s3:GetObject'],
   *           Resource: [$CfFormat('{}/public/*', $ResourceParam('myBucket', 'arn'))]
   *         }
   *       ]
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  accessPolicyStatements?: BucketPolicyIamRoleStatement[];
}

interface BucketCdnConfiguration extends CdnConfiguration {
  /**
   * #### Rewrites incoming requests to work for a single-page application.
   *
   * ---
   *
   * The routing works as follows:
   * - If the path has an extension (e.g., `.css`, `.js`, `.png`), the request is not rewritten, and the appropriate file is returned.
   * - If the path does not have an extension, the request is routed to `index.html`.
   *
   * This allows single-page applications to handle routing on the client side.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *         headersPreset: single-page-app
   *       cdn:
   *         enabled: true
   *         # stp-focus
   *         rewriteRoutesForSinglePageApp: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist',
   *       headersPreset: 'single-page-app'
   *     },
   *     cdn: {
   *       enabled: true,
   *       // stp-focus
   *       rewriteRoutesForSinglePageApp: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   */
  rewriteRoutesForSinglePageApp?: boolean;
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from the bucket with clean URLs.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *     properties:
   *       directoryUpload:
   *         directoryPath: ./dist
   *       cdn:
   *         enabled: true
   *         # stp-focus
   *         disableUrlNormalization: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({
   *     directoryUpload: {
   *       directoryPath: './dist'
   *     },
   *     cdn: {
   *       enabled: true,
   *       // stp-focus
   *       disableUrlNormalization: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { assetsBucket } };
   * });
   * ```
   *
   * @default false
   */
  disableUrlNormalization?: boolean;
}

interface LifecycleRuleBase {
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: expiration
   *           properties:
   *             # stp-focus
   *             prefix: logs/
   *             # stp-end-focus
   *             daysAfterUpload: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'expiration',
   *         properties: {
   *           // stp-focus
   *           prefix: 'logs/',
   *           // stp-end-focus
   *           daysAfterUpload: 30
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: class-transition
   *           properties:
   *             # stp-focus
   *             tags:
   *               - key: tier
   *                 value: archive
   *             # stp-end-focus
   *             daysAfterUpload: 60
   *             storageClass: GLACIER
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'class-transition',
   *         properties: {
   *           // stp-focus
   *           tags: [{ key: 'tier', value: 'archive' }],
   *           // stp-end-focus
   *           daysAfterUpload: 60,
   *           storageClass: 'GLACIER'
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  tags?: KeyValuePair[];
}

interface Expiration {
  type: 'expiration';
  properties: ExpirationProps;
}

interface ExpirationProps extends LifecycleRuleBase {
  /**
   * #### Delete objects this many days after upload.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: expiration
   *           properties:
   *             prefix: tmp/
   *             # stp-focus
   *             daysAfterUpload: 7
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'expiration',
   *         properties: {
   *           prefix: 'tmp/',
   *           // stp-focus
   *           daysAfterUpload: 7
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  daysAfterUpload: number;
}

interface NonCurrentVersionExpiration {
  type: 'non-current-version-expiration';
  properties: NonCurrentVersionExpirationProps;
}

interface NonCurrentVersionExpirationProps extends LifecycleRuleBase {
  /**
   * #### Delete old versions this many days after they become non-current. Requires `versioning: true`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       versioning: true
   *       lifecycleRules:
   *         - type: non-current-version-expiration
   *           properties:
   *             # stp-focus
   *             daysAfterVersioned: 30
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     versioning: true,
   *     lifecycleRules: [
   *       {
   *         type: 'non-current-version-expiration',
   *         properties: {
   *           // stp-focus
   *           daysAfterVersioned: 30
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  daysAfterVersioned: number;
}

interface ClassTransition {
  type: 'class-transition';
  properties: ClassTransitionProps;
}

interface ClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### Move objects to a cheaper storage class this many days after upload.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: class-transition
   *           properties:
   *             prefix: archive/
   *             # stp-focus
   *             daysAfterUpload: 90
   *             # stp-end-focus
   *             storageClass: GLACIER
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'class-transition',
   *         properties: {
   *           prefix: 'archive/',
   *           // stp-focus
   *           daysAfterUpload: 90,
   *           // stp-end-focus
   *           storageClass: 'GLACIER'
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  daysAfterUpload: number;
  /**
   * #### Target storage class. Cheaper classes have higher retrieval costs/latency.
   *
   * ---
   *
   * - `STANDARD_IA` / `ONEZONE_IA`: Infrequent access, instant retrieval.
   * - `INTELLIGENT_TIERING`: AWS auto-moves between tiers based on access patterns.
   * - `GLACIER`: Archive, minutes to hours for retrieval.
   * - `DEEP_ARCHIVE`: Cheapest, 12+ hours for retrieval.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: class-transition
   *           properties:
   *             prefix: cold/
   *             daysAfterUpload: 180
   *             # stp-focus
   *             storageClass: DEEP_ARCHIVE
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'class-transition',
   *         properties: {
   *           prefix: 'cold/',
   *           daysAfterUpload: 180,
   *           // stp-focus
   *           storageClass: 'DEEP_ARCHIVE'
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface NonCurrentVersionClassTransition {
  type: 'non-current-version-class-transition';
  properties: NonCurrentVersionClassTransitionProps;
}

interface NonCurrentVersionClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### Move old versions to a cheaper storage class this many days after becoming non-current.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       versioning: true
   *       lifecycleRules:
   *         - type: non-current-version-class-transition
   *           properties:
   *             # stp-focus
   *             daysAfterVersioned: 30
   *             # stp-end-focus
   *             storageClass: STANDARD_IA
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     versioning: true,
   *     lifecycleRules: [
   *       {
   *         type: 'non-current-version-class-transition',
   *         properties: {
   *           // stp-focus
   *           daysAfterVersioned: 30,
   *           // stp-end-focus
   *           storageClass: 'STANDARD_IA'
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  daysAfterVersioned: number;
  /**
   * #### Target storage class for non-current versions.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       versioning: true
   *       lifecycleRules:
   *         - type: non-current-version-class-transition
   *           properties:
   *             daysAfterVersioned: 60
   *             # stp-focus
   *             storageClass: GLACIER
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     versioning: true,
   *     lifecycleRules: [
   *       {
   *         type: 'non-current-version-class-transition',
   *         properties: {
   *           daysAfterVersioned: 60,
   *           // stp-focus
   *           storageClass: 'GLACIER'
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface AbortIncompleteMultipartUpload {
  type: 'abort-incomplete-multipart-upload';
  properties: AbortIncompleteMultipartUploadProps;
}

interface AbortIncompleteMultipartUploadProps extends LifecycleRuleBase {
  /**
   * #### Clean up incomplete multipart uploads after this many days. Prevents storage waste.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       lifecycleRules:
   *         - type: abort-incomplete-multipart-upload
   *           properties:
   *             # stp-focus
   *             daysAfterInitiation: 7
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     lifecycleRules: [
   *       {
   *         type: 'abort-incomplete-multipart-upload',
   *         properties: {
   *           // stp-focus
   *           daysAfterInitiation: 7
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  daysAfterInitiation: number;
}

interface BucketCorsConfig {
  /**
   * #### Enable CORS. When `true` with no rules, uses permissive defaults (`*` origins, all methods).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       # stp-focus
   *       cors:
   *         enabled: true
   *       # stp-end-focus
   *       accessibility:
   *         accessibilityMode: public-read
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     // stp-focus
   *     cors: {
   *       enabled: true
   *     },
   *     // stp-end-focus
   *     accessibility: {
   *       accessibilityMode: 'public-read'
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  enabled: boolean;
  /**
   * #### Custom CORS rules. First matching rule wins for each preflight request.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         # stp-focus
   *         corsRules:
   *           - allowedOrigins:
   *               - 'https://example.com'
   *             allowedMethods:
   *               - GET
   *               - PUT
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       // stp-focus
   *       corsRules: [
   *         {
   *           allowedOrigins: ['https://example.com'],
   *           allowedMethods: ['GET', 'PUT']
   *         }
   *       ]
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  corsRules?: BucketCorsRule[];
}

interface BucketCorsRule {
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         corsRules:
   *             # stp-focus
   *           - allowedOrigins:
   *               - 'https://app.example.com'
   *               - 'https://admin.example.com'
   *             # stp-end-focus
   *             allowedMethods:
   *               - GET
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       corsRules: [
   *         {
   *           // stp-focus
   *           allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
   *           // stp-end-focus
   *           allowedMethods: ['GET']
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         corsRules:
   *           - allowedOrigins:
   *               - 'https://app.example.com'
   *             allowedMethods:
   *               - PUT
   *             # stp-focus
   *             allowedHeaders:
   *               - 'Content-Type'
   *               - 'Authorization'
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       corsRules: [
   *         {
   *           allowedOrigins: ['https://app.example.com'],
   *           allowedMethods: ['PUT'],
   *           // stp-focus
   *           allowedHeaders: ['Content-Type', 'Authorization']
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         corsRules:
   *           - allowedOrigins:
   *               - 'https://app.example.com'
   *             # stp-focus
   *             allowedMethods:
   *               - GET
   *               - PUT
   *               - POST
   *               - DELETE
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       corsRules: [
   *         {
   *           allowedOrigins: ['https://app.example.com'],
   *           // stp-focus
   *           allowedMethods: ['GET', 'PUT', 'POST', 'DELETE']
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | '*')[];
  /**
   * #### Response headers accessible to browser JavaScript.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         corsRules:
   *           - allowedOrigins:
   *               - 'https://app.example.com'
   *             allowedMethods:
   *               - GET
   *             # stp-focus
   *             exposedResponseHeaders:
   *               - 'ETag'
   *               - 'x-amz-request-id'
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       corsRules: [
   *         {
   *           allowedOrigins: ['https://app.example.com'],
   *           allowedMethods: ['GET'],
   *           // stp-focus
   *           exposedResponseHeaders: ['ETag', 'x-amz-request-id']
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myBucket:
   *     type: bucket
   *     properties:
   *       cors:
   *         enabled: true
   *         corsRules:
   *           - allowedOrigins:
   *               - 'https://app.example.com'
   *             allowedMethods:
   *               - GET
   *             # stp-focus
   *             maxAge: 3600
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const myBucket = new Bucket({
   *     cors: {
   *       enabled: true,
   *       corsRules: [
   *         {
   *           allowedOrigins: ['https://app.example.com'],
   *           allowedMethods: ['GET'],
   *           // stp-focus
   *           maxAge: 3600
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { myBucket } };
   * });
   * ```
   */
  maxAge?: number;
}

type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;
