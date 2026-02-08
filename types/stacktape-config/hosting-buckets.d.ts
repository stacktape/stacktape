/**
 * #### Host a static website (React, Vue, Astro, etc.) on S3 + CloudFront CDN.
 *
 * ---
 *
 * Combines S3 storage with a global CDN for fast, cheap, and scalable static site hosting.
 * Includes build step, custom domains, caching presets, and environment injection.
 */
interface HostingBucket {
  type: 'hosting-bucket';
  properties: HostingBucketProps;
  overrides?: ResourceOverrides;
}

interface HostingBucketProps {
  /**
   * #### Path to the build output directory (e.g., `dist`, `build`, `out`).
   *
   * ---
   *
   * This folder's contents are uploaded to the bucket on every deploy.
   */
  uploadDirectoryPath: string;
  /**
   * #### Build command that produces the files to upload (e.g., `npm run build`).
   *
   * ---
   *
   * Runs during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs.
   */
  build?: HostingBucketBuild;
  /**
   * #### Dev server command for local development (e.g., `npm run dev`, `vite`).
   *
   * ---
   *
   * Used by `stacktape dev`.
   */
  dev?: HostingBucketBuild;
  /**
   * #### Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`).
   */
  excludeFilesPatterns?: string[];
  /**
   * #### Optimizes caching and routing for your type of frontend app.
   *
   * ---
   *
   * - **`single-page-app`**: For React, Vue, Angular, or any SPA built with Vite/Webpack.
   *   Enables client-side routing (e.g., `/about` serves `index.html`). HTML is never browser-cached;
   *   hashed assets (`.js`, `.css`) are cached forever.
   *
   * - **`static-website`** (default): For multi-page static sites. All files are CDN-cached
   *   but never browser-cached, so users always see the latest content after a deploy.
   *
   * - **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**:
   *   Framework-specific presets that cache hashed build assets (`_astro/`, `_app/`, `_nuxt/`)
   *   indefinitely while keeping HTML fresh.
   *
   * - **`gatsby-static-website`**: Gatsby-specific caching following their recommendations.
   *
   * You can override any preset's behavior using `fileOptions`.
   *
   * @default "static-website"
   */
  hostingContentType?: SupportedHeaderPreset;
  /**
   * #### Custom domains (e.g., `www.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
   * @default false
   */
  disableUrlNormalization?: boolean;
  /**
   * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
   *
   * ---
   *
   * - `onRequest`: Before cache lookup and before forwarding to the bucket.
   * - `onResponse`: Before returning the response to the client.
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   * @default /index.html
   */
  indexDocument?: string;
  /**
   * #### Inject deploy-time values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`.
   *
   * ---
   *
   * Useful for making API URLs, User Pool IDs, and other dynamic values
   * available to your frontend JavaScript without rebuilding.
   */
  injectEnvironment?: EnvironmentVar[];
  /**
   * #### Write deploy-time values to a `.env` file in the specified directory.
   *
   * ---
   *
   * Merges with existing `.env` content if the file already exists.
   */
  writeDotenvFilesTo?: string;
  /**
   * #### Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`.
   */
  useFirewall?: string;
  /**
   * #### Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the bucket.
   */
  routeRewrites?: CdnRouteRewrite[];
}

type WriteEnvFilesFormat = 'dotenv';

interface HostingBucketBuild {
  /**
   * #### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`).
   */
  command: string;
  /**
   * #### Working directory for the command (relative to project root).
   * @default "."
   */
  workingDirectory?: string;
}

type StpHostingBucket = HostingBucket['properties'] & {
  name: string;
  type: HostingBucket['type'];
  configParentResourceType: HostingBucket['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
  };
};
