# Hosting Bucket

Resource type: `hosting-bucket`

## TypeScript Definition

```typescript
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  uploadDirectoryPath: string;
  /**
   * #### Build command that produces the files to upload (e.g., `npm run build`).
   *
   * ---
   *
   * Runs during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *         workingDirectory: .
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: {
   *       command: 'npm run build',
   *       workingDirectory: '.'
   *     }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  build?: HostingBucketBuild;
  /**
   * #### Dev server command for local development (e.g., `npm run dev`, `vite`).
   *
   * ---
   *
   * Used by `stacktape dev`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       dev:
   *         command: npm run dev
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     dev: { command: 'npm run dev' }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  dev?: HostingBucketBuild;
  /**
   * #### Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: static-website
   *       build:
   *         command: npm run build
   *       excludeFilesPatterns:
   *         - '**/*.map'
   *         - 'stats.html'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'static-website',
   *     build: { command: 'npm run build' },
   *     excludeFilesPatterns: ['**/*.map', 'stats.html']
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       customDomains:
   *         - domainName: www.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     customDomains: [{ domainName: 'www.example.com' }]
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./public
   *       hostingContentType: static-website
   *       build:
   *         command: npm run build
   *       disableUrlNormalization: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './public',
   *     hostingContentType: 'static-website',
   *     build: { command: 'npm run build' },
   *     disableUrlNormalization: true
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   *
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authChecker:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./edge/auth.ts
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       edgeFunctions:
   *         onRequest: authChecker
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, EdgeLambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authChecker = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './edge/auth.ts' }
   *     }
   *   });
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     edgeFunctions: { onRequest: 'authChecker' }
   *   });
   *   return { resources: { authChecker, frontend } };
   * });
   * ```
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: static-website
   *       build:
   *         command: npm run build
   *       errorDocument: /error.html
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'static-website',
   *     build: { command: 'npm run build' },
   *     errorDocument: '/error.html'
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: static-website
   *       build:
   *         command: npm run build
   *       indexDocument: /index.html
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'static-website',
   *     build: { command: 'npm run build' },
   *     indexDocument: '/index.html'
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   *
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       injectEnvironment:
   *         - name: API_URL
   *           value: $ResourceParam('apiGateway', 'url')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, HttpApiGateway, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({});
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     injectEnvironment: { API_URL: $ResourceParam('apiGateway', 'url') }
   *   });
   *   return { resources: { apiGateway, frontend } };
   * });
   * ```
   */
  injectEnvironment?: EnvironmentVar[];
  /**
   * #### Write deploy-time values to a `.env` file in the specified directory.
   *
   * ---
   *
   * Merges with existing `.env` content if the file already exists.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       injectEnvironment:
   *         - name: API_URL
   *           value: $ResourceParam('apiGateway', 'url')
   *       writeDotenvFilesTo: ./
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, HttpApiGateway, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({});
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     injectEnvironment: { API_URL: $ResourceParam('apiGateway', 'url') },
   *     writeDotenvFilesTo: './'
   *   });
   *   return { resources: { apiGateway, frontend } };
   * });
   * ```
   */
  writeDotenvFilesTo?: string;
  /**
   * #### Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   siteFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       useFirewall: siteFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const siteFirewall = new WebAppFirewall({ scope: 'cdn' });
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     useFirewall: 'siteFirewall'
   *   });
   *   return { resources: { siteFirewall, frontend } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       fileOptions:
   *         - includePattern: 'assets/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     fileOptions: [
   *       {
   *         includePattern: 'assets/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       }
   *     ]
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the bucket.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *       routeRewrites:
   *         - path: /api/*
   *           routeTo:
   *             type: http-api-gateway
   *             properties:
   *               httpApiGatewayName: apiGateway
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({});
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: { command: 'npm run build' },
   *     routeRewrites: [
   *       {
   *         path: '/api/*',
   *         routeTo: {
   *           type: 'http-api-gateway',
   *           properties: { httpApiGatewayName: 'apiGateway' }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { apiGateway, frontend } };
   * });
   * ```
   */
  routeRewrites?: CdnRouteRewrite[];
}

type WriteEnvFilesFormat = 'dotenv';

interface HostingBucketBuild {
  /**
   * #### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *         workingDirectory: .
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './dist',
   *     hostingContentType: 'single-page-app',
   *     build: {
   *       command: 'npm run build',
   *       workingDirectory: '.'
   *     }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   */
  command: string;
  /**
   * #### Working directory for the command (relative to project root).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   frontend:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./apps/web/dist
   *       hostingContentType: single-page-app
   *       build:
   *         command: npm run build
   *         workingDirectory: ./apps/web
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const frontend = new HostingBucket({
   *     uploadDirectoryPath: './apps/web/dist',
   *     hostingContentType: 'single-page-app',
   *     build: {
   *       command: 'npm run build',
   *       workingDirectory: './apps/web'
   *     }
   *   });
   *   return { resources: { frontend } };
   * });
   * ```
   *
   * @default "."
   */
  workingDirectory?: string;
}
```
