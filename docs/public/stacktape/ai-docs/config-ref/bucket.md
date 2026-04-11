---
docType: config-ref
title: Bucket
resourceType: bucket
tags:
  - bucket
  - s3
  - storage
  - object-storage
source: types/stacktape-config/buckets.d.ts
priority: 1
---

# Bucket

S3 storage bucket for files, images, backups, or any binary data.

Pay only for what you store and transfer. Highly durable (99.999999999%).

Resource type: `bucket`

## TypeScript Definition

```typescript
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
   */
  directoryPath: string;
  /**
   * #### Set HTTP headers or tags on files matching specific patterns.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Glob patterns for files to skip during upload (relative to `directoryPath`).
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
   */
  headersPreset?: SupportedHeaderPreset;
  /**
   * #### Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost.
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}

interface KeyValuePair {
  /**
   * #### Key
   */
  key: string;
  /**
   * #### Value
   */
  value: string;
}

interface DirectoryUploadFilter {
  /**
   * #### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`).
   */
  includePattern: string;
  /**
   * #### Glob pattern for files to exclude even if they match `includePattern`.
   */
  excludePattern?: string;
  /**
   * #### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.
   */
  headers?: KeyValuePair[];
  /**
   * #### Tags for matching files. Can be used to target files with `lifecycleRules`.
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
   */
  directoryUpload?: DirectoryUpload;
  /**
   * #### Who can read/write to this bucket: `private` (default), `public-read`, or `public-read-write`.
   */
  accessibility?: BucketAccessibility;
  /**
   * #### CORS settings for browser-based access to the bucket.
   */
  cors?: BucketCorsConfig;
  /**
   * #### Keep previous versions of overwritten/deleted objects. Helps recover from mistakes.
   */
  versioning?: boolean;
  /**
   * #### Encrypt stored objects at rest (AES-256).
   */
  encryption?: boolean;
  /**
   * #### Auto-delete or move objects to cheaper storage classes over time.
   *
   * ---
   *
   * Use to control storage costs: expire old files, archive infrequently accessed data,
   * or clean up incomplete uploads.
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
   * @default false
   */
  enableEventBusNotifications?: boolean;
  /**
   * #### Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs.
   */
  cdn?: BucketCdnConfiguration;
}

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
   * @default private
   */
  accessibilityMode: 'private' | 'public-read-write' | 'public-read';
  /**
   * #### Advanced access configuration that leverages IAM policy statements.
   *
   * ---
   *
   * This gives you fine-grained access control over the bucket.
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
   */
  rewriteRoutesForSinglePageApp?: boolean;
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from the bucket with clean URLs.
   *
   * @default false
   */
  disableUrlNormalization?: boolean;
}

interface LifecycleRuleBase {
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
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
   */
  daysAfterVersioned: number;
  /**
   * #### Target storage class for non-current versions.
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
   */
  daysAfterInitiation: number;
}

interface BucketCorsConfig {
  /**
   * #### Enable CORS. When `true` with no rules, uses permissive defaults (`*` origins, all methods).
   */
  enabled: boolean;
  /**
   * #### Custom CORS rules. First matching rule wins for each preflight request.
   */
  corsRules?: BucketCorsRule[];
}

interface BucketCorsRule {
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any.
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers.
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods.
   */
  allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | '*')[];
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}

type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;
```
