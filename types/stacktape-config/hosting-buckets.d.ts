/**
 * #### Hosting Bucket
 *
 * ---
 *
 * A resource designed to host your static website or other static content.
 * It combines the power of an S3 Bucket (for storing data) and a CloudFront CDN (for distributing it globally).
 */
interface HostingBucket {
  type: 'hosting-bucket';
  properties: HostingBucketProps;
  overrides?: ResourceOverrides;
}

interface HostingBucketProps {
  /**
   * #### The path to the directory to upload.
   *
   * ---
   *
   * This should be the path to the directory containing the content you want to host, such as the output directory of your website's build process.
   *
   * The contents of this folder will be uploaded to the bucket during the `deploy`, `codebuild:deploy`, or `bucket:sync` commands.
   */
  uploadDirectoryPath: string;
  /**
   * #### Glob patterns for files to be excluded from the upload.
   *
   * ---
   *
   * These patterns are relative to the `uploadDirectoryPath`.
   */
  excludeFilesPatterns?: string[];
  /**
   * #### Configures HTTP headers of uploaded files and CDN behavior based on the content type.
   *
   * ---
   *
   * Supported content types:
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
   *   - All other assets (e.g., `.js`, `.css`) are cached indefinitely. You should **always** add a content hash to your filenames to ensure users receive new versions after updates. For more details, see the documentation for your bundler (e.g., [webpack](https://webpack.js.org/guides/caching/)).
   *   - Sets up the necessary CDN redirects for a single-page app.
   *
   * @default static-website
   */
  hostingContentType?: SupportedHeaderPreset;
  /**
   * #### Attaches custom domains to this hosting bucket.
   *
   * ---
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** Stacktape issues and attaches a free, AWS-managed TLS certificate to handle HTTPS.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from a bucket with clean URLs (without the `.html` extension).
   *
   * @default false
   */
  disableUrlNormalization?: boolean;
  /**
   * #### Configures Edge function triggers.
   *
   * ---
   *
   * You can associate an `edge-lambda-function` with this hosting bucket to be executed at different stages:
   *
   * - `onRequest`: Executed when the CDN receives a request from a client, before checking the cache and before the request is forwarded to the hosting bucket.
   * - `onResponse`: Executed before returning a response to the client.
   *
   * **Potential Use Cases:**
   * - Generating an immediate HTTP response without checking the cache or forwarding to the bucket.
   * - Modifying the request (e.g., rewriting the URL or headers) before forwarding to the bucket.
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### The custom error document URL.
   *
   * ---
   *
   * This document is requested if the original request to the origin returns a `404` error code.
   *
   * Example: `/error.html`
   */
  errorDocument?: string;
  /**
   * #### The custom index document served for requests to the root path (`/`).
   *
   * ---
   *
   * @default /index.html
   */
  indexDocument?: string;
  /**
   * #### Injects referenced parameters into all HTML files in the `uploadDirectoryPath`.
   *
   * ---
   *
   * These parameters can be accessed by any JavaScript script using `window.STP_INJECTED_ENV.VARIABLE_NAME`.
   * This is useful for automatically referencing parameters that are only known after deployment, such as the URL of an API Gateway or the ID of a User Pool.
   */
  injectEnvironment?: EnvironmentVar[];
  /**
   * #### Injects referenced parameters into `.env` files within the specified directory.
   *
   * ---
   *
   * Writes the injected environment variables to a file named `.env`.
   * If the file already exists, the new variables will be merged with the existing ones.
   */
  writeDotenvFilesTo?: string;
  /**
   * #### The name of the `web-app-firewall` resource to use to protect this hosting bucket.
   *
   * ---
   *
   * A `web-app-firewall` can protect your resources from common web exploits that could affect availability, compromise security, or consume excessive resources.
   *
   * For more information, see the [firewall documentation](https://docs.stacktape.com/security-resources/web-app-firewalls/).
   *
   * > **Note:** Because this resource uses a CDN, the `scope` of the `web-app-firewall` must be set to `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Allows you to manually set headers (e.g., `Cache-Control`, `Content-Type`) for files that match a filter pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Redirects specific requests to a different origin.
   *
   * ---
   *
   * Each incoming request to the CDN is evaluated against a list of route rewrites. If the request path matches a rewrite's path pattern, it is sent to the configured route.
   * Route rewrites are evaluated in order, and the first match determines where the request will be sent.
   *
   * If no match is found, the request is sent to the default origin (the hosting bucket).
   *
   * **Example Use Cases:**
   * - Serving static content from the bucket while routing dynamic paths to a Lambda function.
   * - Caching `.jpg` files for a longer duration than other file types.
   */
  routeRewrites?: CdnRouteRewrite[];
}

type WriteEnvFilesFormat = 'dotenv';

type StpHostingBucket = HostingBucket['properties'] & {
  name: string;
  type: HostingBucket['type'];
  configParentResourceType: HostingBucket['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
  };
};
