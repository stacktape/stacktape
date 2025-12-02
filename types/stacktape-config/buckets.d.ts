/**
 * #### Storage Bucket
 *
 * ---
 *
 * A durable and highly available object storage service with pay-per-use pricing.
 */
interface Bucket {
  type: 'bucket';
  properties?: BucketProps;
  overrides?: ResourceOverrides;
}

type SupportedHeaderPreset = 'gatsby-static-website' | 'static-website' | 'single-page-app';

interface DirectoryUpload {
  /**
   * #### The path to the directory that should be uploaded to the bucket.
   *
   * ---
   *
   * After the sync is finished, the contents of your bucket will mirror the contents of the local folder.
   * The path is relative to your current working directory.
   *
   * > **Warning:** Any existing contents of the bucket will be deleted and replaced with the contents of the local directory.
   * > You should not use a bucket with `directoryUpload` enabled for application-generated or user-generated content.
   */
  directoryPath: string;
  /**
   * #### Allows you to set properties of files (objects) during the upload.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Glob patterns for files to be excluded from the upload.
   *
   * ---
   *
   * These patterns are relative to the `directoryPath`.
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
   * #### Configures HTTP headers of uploaded files to be optimized for a selected preset.
   *
   * ---
   *
   * Available presets:
   *
   * - **`static-website`**:
   *   - Sets the `Cache-Control` header to `public, max-age=0, s-maxage=31536000, must-revalidate` for all uploaded files.
   *   - This setup caches all content on the CDN but never in the browser.
   *
   * - **`gatsby-static-website`**:
   *   - Optimizes headers for static websites built with [Gatsby](https://www.gatsbyjs.com/), following their [caching recommendations](https://www.gatsbyjs.com/docs/caching/).
   *
   * - **`single-page-app`**:
   *   - Optimizes headers for [Single-Page Applications](https://en.wikipedia.org/wiki/Single-page_application).
   *   - `html` files are never cached to ensure users always get the latest content after a deployment.
   *   - All other assets (e.g., `.js`, `.css`) are cached indefinitely. You should **always** add a content hash to your filenames to ensure users receive new versions after updates.
   *
   * You can override these presets using custom `filters`.
   *
   * > When `headersPreset` is used, `cdn.invalidateAfterDeploy` must also be configured.
   */
  headersPreset?: SupportedHeaderPreset;
  /**
   * #### Disables S3 Transfer Acceleration.
   *
   * ---
   *
   * S3 Transfer Acceleration improves the upload times of your directory contents by uploading objects to the nearest AWS edge location and routing them to the bucket through the AWS backbone network.
   *
   * This feature incurs a small additional cost.
   *
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
   * #### A glob pattern that specifies which files should be handled by this filter.
   *
   * ---
   *
   * The pattern is relative to the `directoryPath`.
   */
  includePattern: string;
  /**
   * #### A glob pattern that specifies which files should be excluded from this filter, even if they match the `includePattern`.
   *
   * ---
   *
   * The pattern is relative to the `directoryPath`.
   */
  excludePattern?: string;
  /**
   * #### Configures HTTP headers for files (objects) that match this filter.
   *
   * ---
   *
   * If you are using a CDN, these headers will be forwarded to the client.
   * This can be used to implement a custom HTTP caching strategy for your static content.
   */
  headers?: KeyValuePair[];
  /**
   * #### Tags to apply to the files that match this filter.
   *
   * ---
   *
   * Tags help you categorize your objects and can be used to filter objects when using `lifecycleRules`.
   *
   * For more details on object tagging, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html).
   *
   * > A single file (object) can have only one tag with the same key.
   */
  tags?: KeyValuePair[];
}

interface BucketProps {
  /**
   * #### Allows you to upload a specified directory to the bucket on every deployment.
   *
   * ---
   *
   * After the upload is finished, the contents of your bucket will mirror the contents of the local folder.
   * Files are uploaded using parallel, multipart uploads.
   *
   * > **Warning:** Any existing contents of the bucket will be deleted and replaced with the contents of the local directory.
   * > You should not use `directoryUpload` for buckets with application-generated or user-generated content.
   */
  directoryUpload?: DirectoryUpload;
  /**
   * #### Configures the accessibility of the bucket.
   */
  accessibility?: BucketAccessibility;
  /**
   * #### Configures CORS (Cross-Origin Resource Sharing) HTTP headers for the bucket.
   *
   * ---
   *
   * Web browsers use CORS to block websites from making requests to a different origin (server) than the one they are served from.
   */
  cors?: BucketCorsConfig;
  /**
   * #### Enables versioning of objects in the bucket.
   *
   * ---
   *
   * When enabled, the bucket will keep multiple variants of an object.
   * This can help you recover objects from accidental deletion or overwrites.
   */
  versioning?: boolean;
  /**
   * #### Enables encryption of the objects stored in this bucket.
   *
   * ---
   *
   * Objects are encrypted using the AES-256 algorithm.
   */
  encryption?: boolean;
  /**
   * #### Configures how objects are stored throughout their lifecycle.
   *
   * ---
   *
   * Lifecycle rules are used to transition objects to different storage classes or delete old objects.
   */
  lifecycleRules?: (
    | Expiration
    | NonCurrentVersionExpiration
    | ClassTransition
    | NonCurrentVersionClassTransition
    | AbortIncompleteMultipartUpload
  )[];
  /**
   * #### Enables sending bucket events to the default EventBridge bus.
   *
   * ---
   *
   * When enabled, an event is sent to the default event bus whenever certain actions occur in your bucket (e.g., an object is created or deleted).
   *
   * For a full list of all bucket events, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html).
   *
   * @default false
   */
  enableEventBusNotifications?: boolean;
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your bucket.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your bucket, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin.
   * - Enhance security.
   *
   * The "origin" is the resource (in this case, the bucket) that the CDN is attached to.
   */
  cdn?: BucketCdnConfiguration;
}

type StpBucket = Bucket['properties'] & {
  name: string;
  type: Bucket['type'];
  configParentResourceType: Bucket['type'] | HostingBucket['type'] | NextjsWeb['type'];
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
   * #### The prefix of the objects to which the lifecycle rule is applied.
   */
  prefix?: string;
  /**
   * #### The tags of the objects to which the lifecycle rule is applied.
   *
   * ---
   *
   * For more details on tagging objects, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html).
   */
  tags?: KeyValuePair[];
}

interface Expiration {
  type: 'expiration';
  properties: ExpirationProps;
}

interface ExpirationProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an object is considered expired.
   *
   * ---
   *
   * This is relative to the date the object was uploaded.
   */
  daysAfterUpload: number;
}

interface NonCurrentVersionExpiration {
  type: 'non-current-version-expiration';
  properties: NonCurrentVersionExpirationProps;
}

interface NonCurrentVersionExpirationProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which a non-current version of an object becomes expired.
   *
   * ---
   *
   * This is relative to the date the object became a non-current version.
   * This rule is only effective if the bucket has versioning enabled.
   */
  daysAfterVersioned: number;
}

interface ClassTransition {
  type: 'class-transition';
  properties: ClassTransitionProps;
}

interface ClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an object is transitioned to another storage class.
   *
   * ---
   *
   * This is relative to the date the object was uploaded.
   * Depending on how often you need to access your objects, transitioning them to another storage class can lead to significant cost savings.
   */
  daysAfterUpload: number;
  /**
   * #### The storage class to which to transition the object.
   *
   * ---
   *
   * By default, all objects are in the `STANDARD` (general purpose) class.
   * Depending on your access patterns, you can transition objects to a different storage class to save costs.
   *
   * For more details on storage classes, see the [AWS documentation](https://aws.amazon.com/s3/storage-classes/).
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface NonCurrentVersionClassTransition {
  type: 'non-current-version-class-transition';
  properties: NonCurrentVersionClassTransitionProps;
}

interface NonCurrentVersionClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which a non-current version of an object is transitioned to another storage class.
   *
   * ---
   *
   * This is relative to the date the object became a non-current version.
   * Depending on how often you need to access your objects, transitioning them to another storage class can lead to significant cost savings.
   */
  daysAfterVersioned: number;
  /**
   * #### The storage class to which to transition the object.
   *
   * ---
   *
   * For more details on storage classes and transitions, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html).
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface AbortIncompleteMultipartUpload {
  type: 'abort-incomplete-multipart-upload';
  properties: AbortIncompleteMultipartUploadProps;
}

interface AbortIncompleteMultipartUploadProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an incomplete multipart upload is aborted and its parts are deleted.
   *
   * ---
   *
   * This is relative to the start of the multipart upload.
   */
  daysAfterInitiation: number;
}

interface BucketCorsConfig {
  /**
   * #### Enables CORS (Cross-Origin Resource Sharing) HTTP headers for the bucket.
   *
   * ---
   *
   * If you enable CORS without specifying any rules, a default rule with the following configuration is used:
   * - `allowedMethods`: `GET`, `PUT`, `HEAD`, `POST`, `DELETE`
   * - `allowedOrigins`: `*`
   * - `allowedHeaders`: `Authorization`, `Content-Length`, `Content-Type`, `Content-MD5`, `Date`, `Expect`, `Host`, `x-amz-content-sha256`, `x-amz-date`, `x-amz-security-token`
   */
  enabled: boolean;
  /**
   * #### A list of CORS rules.
   *
   * ---
   *
   * When the bucket receives a preflight request from a browser, it evaluates the CORS configuration and uses the first rule that matches the request to enable a cross-origin request.
   * For a rule to match, the following conditions must be met:
   *
   * - The request's `Origin` header must match one of the `allowedOrigins`.
   * - The request method (e.g., `GET`, `PUT`) or the `Access-Control-Request-Method` header must be one of the `allowedMethods`.
   * - Every header listed in the request's `Access-Control-Request-Headers` header must match one of the `allowedHeaders`.
   */
  corsRules?: BucketCorsRule[];
}

interface BucketCorsRule {
  /**
   * #### The origins to accept cross-domain requests from.
   *
   * ---
   *
   * An origin is a combination of a scheme (protocol), hostname (domain), and port.
   */
  allowedOrigins?: string[];
  /**
   * #### The allowed HTTP headers.
   *
   * ---
   *
   * Each header name in the `Access-Control-Request-Headers` header of a preflight request must match an entry in this list.
   */
  allowedHeaders?: string[];
  /**
   * #### The allowed HTTP methods.
   */
  allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | '*')[];
  /**
   * #### The response headers that should be made available to scripts running in the browser in response to a cross-origin request.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### The time (in seconds) that the browser can cache the response for a preflight request.
   */
  maxAge?: number;
}

type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;
