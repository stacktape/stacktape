import type { EnvironmentVar } from './shared';

export interface DockerBuildArg {
  /**
   * #### Argument name
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             buildContextPath: ./worker
  *             buildArgs:
  *               # stp-focus
  *               - argName: PYTHON_VERSION
  *               # stp-end-focus
  *                 value: "3.12"
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           buildContextPath: './worker',
  *           buildArgs: [
  *             {
  *               // stp-focus
  *               argName: 'PYTHON_VERSION',
  *               // stp-end-focus
  *               value: '3.12'
  *             }
  *           ]
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  argName: string;
  /**
   * #### Argument value
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             buildContextPath: ./worker
  *             buildArgs:
  *               - argName: PYTHON_VERSION
  *                 # stp-focus
  *                 value: "3.12"
  *                 # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           buildContextPath: './worker',
  *           buildArgs: [
  *             {
  *               argName: 'PYTHON_VERSION',
  *               // stp-focus
  *               value: '3.12'
  *               // stp-end-focus
  *             }
  *           ]
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  value: string;
}


/**
 * #### Bundles a JavaScript or TypeScript entry file with Stacktape's bundler.
 *
 * ---
 *
 * The entry file and everything it imports become one file. Dependencies that cannot be bundled (native add-ons,
 * packages excluded with `dependenciesToExcludeFromBundle`) are installed separately. Artifacts are cached by a
 * checksum of their inputs, so unchanged code is not built again.
 */
export interface JsBundleSharedProps {
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * The file and everything it imports are bundled into a single file. Dependencies with native binaries are
   * installed separately into the artifact.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           # stp-focus
  *           entryfilePath: src/handlers/api.ts
  *           # stp-end-focus
  *       memory: 512
  *       timeout: 15
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         // stp-focus
  *         entryfilePath: 'src/handlers/api.ts'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512,
  *     timeout: 15
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  entryfilePath: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           includeFiles:
  *             - templates/**\/*.html
  *             - config/defaults.json
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         includeFiles: ['templates/**\/*.html', 'config/defaults.json']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           excludeFiles:
  *             - "**\/*.test.ts"
  *             - "**\/__mocks__/**"
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         excludeFiles: ['**\/*.test.ts', '**\/__mocks__/**']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  excludeFiles?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           excludeDependencies:
  *             - aws-sdk
  *             - "@aws-sdk/client-s3"
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         excludeDependencies: ['aws-sdk', '@aws-sdk/client-s3']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  excludeDependencies?: string[];
  /**
   * #### The path to the `tsconfig.json` file.
   *
   * ---
   *
   * This is primarily used to resolve path aliases during the build process.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           tsConfigPath: src/tsconfig.build.json
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         tsConfigPath: 'src/tsconfig.build.json'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  tsConfigPath?: string;
  /**
   * #### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.
   *
   * Source maps are disabled for this artifact because the decorator transform and bundler cannot yet compose their
   * mappings accurately. Emitting a map would give production stack traces incorrect line numbers.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/main.ts
  *           # stp-focus
  *           emitTsDecoratorMetadata: true
  *           # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/main.ts',
  *         // stp-focus
  *         emitTsDecoratorMetadata: true
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  emitTsDecoratorMetadata?: boolean;
  /**
   * #### A list of dependencies to exclude from the main bundle.
   *
   * ---
   *
   * These dependencies will be treated as "external" and will not be bundled directly into your application's code.
   * Instead, they will be installed separately in the deployment package.
   * Use `*` to exclude all dependencies from the bundle.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           dependenciesToExcludeFromBundle:
  *             - sharp
  *             - "@prisma/client"
  *           # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         dependenciesToExcludeFromBundle: ['sharp', '@prisma/client']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  dependenciesToExcludeFromBundle?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
   *
   * ---
   *
   * This only applies to dependencies that are not statically bundled.
   * To exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.
   * Use `*` to exclude all non-bundled dependencies.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           dependenciesToExcludeFromBundle:
  *             - sharp
  *           # stp-focus
  *           dependenciesToExcludeFromDeploymentPackage:
  *             - "@types/node"
  *           # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         dependenciesToExcludeFromBundle: ['sharp'],
  *         // stp-focus
  *         dependenciesToExcludeFromDeploymentPackage: ['@types/node']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  dependenciesToExcludeFromDeploymentPackage?: string[];
  /**
   * #### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).
   *
   * ---
   *
   * **Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces.
   *
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           outputModuleFormat: esm
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         outputModuleFormat: 'esm'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   *
   * When omitted, Node.js 23 and earlier use CommonJS output, while Node.js 24 and later use ESM output.
   * The default is selected by the packaging runtime after resolving `nodeVersion`.
   */
  outputModuleFormat?: 'cjs' | 'esm';
  /**
   * #### The major version of Node.js the buildpack uses to create the artifact. For Lambda packaging, keep the function's `runtime` aligned with this value.
   *
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           nodeVersion: 22
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         nodeVersion: 22
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   *
   * When omitted, image buildpacks use Node.js 24. Lambda buildpacks use the function's `runtime`, falling back to
   * Node.js 24 when neither setting is present. An explicit `nodeVersion` takes precedence over both.
   */
  nodeVersion?: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
  /**
   * #### Skip generating source maps. Reduces package size but makes production errors harder to debug.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           disableSourceMaps: true
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         disableSourceMaps: true
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  disableSourceMaps?: boolean;
  /**
   * #### Save source maps to a local directory instead of uploading them to AWS.
   *
   * ---
   *
   * Useful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           outputSourceMapsTo: ./build/sourcemaps
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         outputSourceMapsTo: './build/sourcemaps'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  outputSourceMapsTo?: string;
  /**
   * #### Minify the bundled code. Local names are kept, so stack traces stay readable.
   *
   * ---
   *
   * Whitespace is removed and syntax is shortened. Local variable and function names are kept, so stack traces and
   * error messages read as your source does. Shortening the names as well is a separate opt-in, `minifyIdentifiers`.
   * Set `minify: false` to deploy the bundle as written.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: src/handlers/api.ts
   *           # stp-focus
   *           minify: false
   *           # stp-end-focus
   *       memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'js-bundle',
   *       properties: {
   *         entryfilePath: 'src/handlers/api.ts',
   *         // stp-focus
   *         minify: false
   *         // stp-end-focus
   *       }
   *     },
   *     memory: 512
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default true
   */
  minify?: boolean;
  /**
   * #### Also shorten local variable and function names when minifying.
   *
   * ---
   *
   * Produces a slightly smaller bundle, but local names disappear from stack traces and from error messages
   * (`TypeError: Ln is not a function`), and the short names change with every build. Stacktape Console groups
   * runtime errors by message and function name, so the same error would open a new issue after each deployment.
   * Has no effect when `minify` is `false`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: src/handlers/api.ts
   *           # stp-focus
   *           minifyIdentifiers: true
   *           # stp-end-focus
   *       memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'js-bundle',
   *       properties: {
   *         entryfilePath: 'src/handlers/api.ts',
   *         // stp-focus
   *         minifyIdentifiers: true
   *         // stp-end-focus
   *       }
   *     },
   *     memory: 512
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default false
   */
  minifyIdentifiers?: boolean;
  /**
   * #### Bundle the AWS SDK from your `node_modules` instead of using the copy the Lambda runtime provides.
   *
   * ---
   *
   * The Node.js 18+ Lambda runtimes ship the AWS SDK v3. By default, imports of `@aws-sdk/client-*` and
   * `@aws-sdk/lib-*` packages are left out of the deployment package and resolved from the runtime, which keeps the
   * package smaller. The runtime's copy can be older than the version in your `package.json`. Enable this when your
   * code needs a newer SDK than the runtime ships. Container workloads have no runtime-provided SDK and always
   * bundle it.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: src/handlers/api.ts
   *           # stp-focus
   *           bundleAwsSdk: true
   *           # stp-end-focus
   *       memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'js-bundle',
   *       properties: {
   *         entryfilePath: 'src/handlers/api.ts',
   *         // stp-focus
   *         bundleAwsSdk: true
   *         // stp-end-focus
   *       }
   *     },
   *     memory: 512
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default false
   */
  bundleAwsSdk?: boolean;
}


export interface JsBundleLambdaPackagingProps extends JsBundleSharedProps {
  /**
   * #### The name of the handler function to be executed when the Lambda is invoked.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           handlerFunction: handler
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         handlerFunction: 'handler'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  handlerFunction?: string;
}


/**
 * #### Bundles a JavaScript or TypeScript Lambda function with Stacktape's bundler.
 *
 * ---
 *
 * The entry file is bundled into a single file with source maps. Shared code of several functions can become a
 * Lambda layer automatically.
 */
export interface JsBundleLambdaPackaging {
  type: 'js-bundle';
  properties: JsBundleLambdaPackagingProps;
}


/**
 * #### Bundles a JavaScript or TypeScript entry file and builds a container image from it.
 */
export interface JsBundleBjImagePackagingProps extends JsBundleSharedProps {
  /**
   * #### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.
   *
   * ---
   *
   * Results in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   imageProcessor:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/server.ts
  *           # stp-focus
  *           requiresGlibcBinaries: true
  *           # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WebService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const imageProcessor = new WebService({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/server.ts',
  *         // stp-focus
  *         requiresGlibcBinaries: true
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { imageProcessor } };
  * });
  * ```
   */
  requiresGlibcBinaries?: boolean;
  /**
   * #### A list of commands to be executed during the `docker build` process.
   *
   * ---
   *
   * These commands are executed using the `RUN` directive in the Dockerfile.
   * This is useful for installing additional system dependencies in your container.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   imageProcessor:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/server.ts
  *           # stp-focus
  *           customDockerBuildCommands:
  *             - apt-get update && apt-get install -y poppler-utils
  *             - fc-cache -f
  *           # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WebService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const imageProcessor = new WebService({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/server.ts',
  *         // stp-focus
  *         customDockerBuildCommands: [
  *           'apt-get update && apt-get install -y poppler-utils',
  *           'fc-cache -f'
  *         ]
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { imageProcessor } };
  * });
  * ```
   */
  customDockerBuildCommands?: string[];
  /**
   * #### The JavaScript runtime the container runs the bundle with: `node` (default), `bun` or `deno`.
   *
   * ---
   *
   * With `bun`, the bundle targets Bun and runs on the official `oven/bun:1` image; with `deno`, the bundle runs on
   * the pinned `denoland/deno` 2.9 image. Dependencies that cannot be bundled are installed with the same runtime's package manager.
   * `nodeVersion` applies only to `node`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: src/server.ts
   *           # stp-focus
   *           runtime: bun
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { JsBundleImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new JsBundleImagePackaging({
   *       entryfilePath: 'src/server.ts',
   *       // stp-focus
   *       runtime: 'bun'
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  runtime?: JsBundleImageRuntime;
}

export type JsBundleImageRuntime = 'node' | 'bun' | 'deno';


/**
 * #### Bundles a JavaScript or TypeScript entry file and builds a container image from it.
 */
export interface JsBundleCwImagePackagingProps extends JsBundleBjImagePackagingProps {}


/**
 * #### Builds a container image from a bundled JavaScript or TypeScript entry file.
 *
 * ---
 *
 * The entry file is bundled into a single file with source maps. Only dependencies that cannot be bundled are installed
 * in the image. The resulting image is uploaded to a managed ECR repository.
 */
export interface JsBundleBjImagePackaging {
  type: 'js-bundle';
  properties: JsBundleBjImagePackagingProps;
}


/**
 * #### Builds a container image from a bundled JavaScript or TypeScript entry file.
 *
 * ---
 *
 * The entry file is bundled into a single file with source maps. Only dependencies that cannot be bundled are installed
 * in the image. The resulting image is uploaded to a managed ECR repository.
 */
export interface JsBundleCwImagePackaging {
  type: 'js-bundle';
  properties: JsBundleCwImagePackagingProps;
}


/**
 * #### Python options of the Lambda buildpack.
 *
 * ---
 *
 * Applies when `entryfilePath` is a `.py` file. The Python version comes from the function's `runtime`.
 */
export interface PythonBuildpackConfig {
  /**
   * #### The path to your project's dependency file.
   *
   * ---
   *
   * This can be a `requirements.txt`, `Pipfile`, `pyproject.toml`, or `uv.lock` file. When both
   * `pyproject.toml` and `uv.lock` exist, Stacktape uses the lock file by default.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           python:
  *             # stp-focus
  *             packageManagerFile: app/pyproject.toml
  *             # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const pyApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         python: {
  *           // stp-focus
  *           packageManagerFile: 'app/pyproject.toml'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   */
  packageManagerFile?: string;
  /**
   * #### Optional dependency extras to include from `pyproject.toml`.
   *
   * ---
   *
   * Each value is passed to `uv pip compile` as `--extra <name>`.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           python:
  *             packageManagerFile: app/pyproject.toml
  *             # stp-focus
  *             uvOptionalDependencies:
  *               - postgres
  *               - redis
  *             # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const pyApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         python: {
  *           packageManagerFile: 'app/pyproject.toml',
  *           // stp-focus
  *           uvOptionalDependencies: ['postgres', 'redis']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   */
  uvOptionalDependencies?: string[];
  /**
   * #### Dependency groups to include from `pyproject.toml`.
   *
   * ---
   *
   * Each value is passed to `uv pip compile` as `--group <name>`.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           python:
  *             packageManagerFile: app/pyproject.toml
  *             # stp-focus
  *             uvWithGroups:
  *               - prod
  *             # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const pyApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         python: {
  *           packageManagerFile: 'app/pyproject.toml',
  *           // stp-focus
  *           uvWithGroups: ['prod']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   */
  uvWithGroups?: string[];
  /**
   * #### Dependency groups to exclude from `pyproject.toml`.
   *
   * ---
   *
   * Each value is passed to `uv pip compile` as `--no-group <name>`.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           python:
  *             packageManagerFile: app/pyproject.toml
  *             # stp-focus
  *             uvWithoutGroups:
  *               - dev
  *               - test
  *             # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const pyApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         python: {
  *           packageManagerFile: 'app/pyproject.toml',
  *           // stp-focus
  *           uvWithoutGroups: ['dev', 'test']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   */
  uvWithoutGroups?: string[];
  /**
   * #### Only include these dependency groups from `pyproject.toml`.
   *
   * ---
   *
   * Each value is passed to `uv pip compile` as `--only-group <name>`.
   * This omits the project dependencies and default groups, matching `uv` behavior.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           python:
  *             packageManagerFile: app/pyproject.toml
  *             # stp-focus
  *             uvOnlyGroups:
  *               - runtime
  *             # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const pyApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         python: {
  *           packageManagerFile: 'app/pyproject.toml',
  *           // stp-focus
  *           uvOnlyGroups: ['runtime']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   */
  uvOnlyGroups?: string[];
}


export type SupportedPythonVersion = 2.7 | 3.6 | 3.7 | 3.8 | 3.9 | '3.10' | 3.11 | 3.12 | 3.13 | 3.14;


/**
 * #### Java options of the Lambda buildpack.
 *
 * ---
 *
 * Applies when `entryfilePath` is a `.java` file. The Java version comes from the function's `runtime`.
 */
export interface JavaBuildpackConfig {
  /**
   * #### Specifies whether to use Maven instead of Gradle.
   *
   * ---
   *
   * By default, Stacktape uses Gradle to build Java projects.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   javaApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: src/main/java/com/example/Handler.java
  *           java:
  *             # stp-focus
  *             useMaven: true
  *             # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const javaApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'src/main/java/com/example/Handler.java',
  *         java: {
  *           // stp-focus
  *           useMaven: true
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { javaApi } };
  * });
  * ```
   */
  useMaven?: boolean;
  /**
   * #### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   javaApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: src/main/java/com/example/Handler.java
  *           java:
  *             useMaven: true
  *             # stp-focus
  *             packageManagerFile: pom.xml
  *             # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const javaApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'src/main/java/com/example/Handler.java',
  *         java: {
  *           useMaven: true,
  *           // stp-focus
  *           packageManagerFile: 'pom.xml'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { javaApi } };
  * });
  * ```
   */
  packageManagerFile?: string;
}


export type SupportedJavaVersion = 8 | 11 | 17 | 19 | 21 | 25;


export type SupportedRubyVersion = 3.2 | 3.3 | 3.4 | 4;


/**
 * #### .NET options of the Lambda buildpack.
 *
 * ---
 *
 * Applies when `entryfilePath` is a `.cs` file. The .NET version comes from the function's `runtime`.
 */
export interface DotnetBuildpackConfig {
  /**
   * #### The path to your .NET project file (.csproj).
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   dotnetApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: buildpack
  *         properties:
  *           entryfilePath: src/Function.cs
  *           dotnet:
  *             # stp-focus
  *             projectFile: src/Api.csproj
  *             # stp-end-focus
  *       memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const dotnetApi = new LambdaFunction({
  *     packaging: {
  *       type: 'buildpack',
  *       properties: {
  *         entryfilePath: 'src/Function.cs',
  *         dotnet: {
  *           // stp-focus
  *           projectFile: 'src/Api.csproj'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { dotnetApi } };
  * });
  * ```
   */
  projectFile?: string;
}


export type SupportedDotnetVersion = 6 | 7 | 8 | 10;


/**
 * #### Builds a Python, Java, Go, Ruby, .NET or Rust Lambda function from its source.
 *
 * ---
 *
 * The language is chosen from the entry file's extension and the toolchain version from the function's `runtime`.
 * Dependencies are installed and the code is compiled in Docker, then zipped into the deployment package.
 */
export interface BuildpackLambdaPackagingProps {
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * The file extension selects the language: `.py`, `.java`, `.go`, `.rb`, `.cs` or `.rs`. Dependencies are
   * installed from the nearest dependency file (`pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`,
   * `go.mod`, `Gemfile`, `*.csproj`, `Cargo.toml`) and the build runs in Docker on the Lambda build image of the
   * function's `runtime`.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           # stp-focus
  *           entryfilePath: src/handlers/api.ts
  *           # stp-end-focus
  *       memory: 512
  *       timeout: 15
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         // stp-focus
  *         entryfilePath: 'src/handlers/api.ts'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512,
  *     timeout: 15
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  entryfilePath: string;
  /**
   * #### The name of the handler function to be executed when the Lambda is invoked.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           handlerFunction: handler
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         handlerFunction: 'handler'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  handlerFunction?: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           includeFiles:
  *             - templates/**\/*.html
  *             - config/defaults.json
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         includeFiles: ['templates/**\/*.html', 'config/defaults.json']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: js-bundle
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           excludeFiles:
  *             - "**\/*.test.ts"
  *             - "**\/__mocks__/**"
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'js-bundle',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         excludeFiles: ['**\/*.test.ts', '**\/__mocks__/**']
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  excludeFiles?: string[];
  /**
   * #### Python options. Applies when `entryfilePath` is a `.py` file.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           entryfilePath: app/main.py
   *           # stp-focus
   *           python:
   *             uvWithGroups:
   *               - lambda
   *           # stp-end-focus
   *       runtime: python3.12
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new BuildpackLambdaPackaging({
   *       entryfilePath: 'app/main.py',
   *       // stp-focus
   *       python: {
   *         uvWithGroups: ['lambda']
   *       }
   *       // stp-end-focus
   *     }),
   *     runtime: 'python3.12'
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  python?: PythonBuildpackConfig;
  /**
   * #### Java options. Applies when `entryfilePath` is a `.java` file.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           entryfilePath: src/main/java/com/example/Handler.java
   *           # stp-focus
   *           java:
   *             useMaven: true
   *           # stp-end-focus
   *       runtime: java21
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new BuildpackLambdaPackaging({
   *       entryfilePath: 'src/main/java/com/example/Handler.java',
   *       // stp-focus
   *       java: {
   *         useMaven: true
   *       }
   *       // stp-end-focus
   *     }),
   *     runtime: 'java21'
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  java?: JavaBuildpackConfig;
  /**
   * #### .NET options. Applies when `entryfilePath` is a `.cs` file.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           entryfilePath: src/Function.cs
   *           # stp-focus
   *           dotnet:
   *             projectFile: src/Function.csproj
   *           # stp-end-focus
   *       runtime: dotnet8
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new BuildpackLambdaPackaging({
   *       entryfilePath: 'src/Function.cs',
   *       // stp-focus
   *       dotnet: {
   *         projectFile: 'src/Function.csproj'
   *       }
   *       // stp-end-focus
   *     }),
   *     runtime: 'dotnet8'
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  dotnet?: DotnetBuildpackConfig;
}


/**
 * #### Builds a Python, Java, Go, Ruby, .NET or Rust Lambda function from its source.
 *
 * ---
 *
 * The language is chosen from the entry file's extension and the toolchain version from the function's `runtime`.
 * Dependencies are installed and the code is compiled in Docker, then zipped into the deployment package.
 */
export interface BuildpackLambdaPackaging {
  type: 'buildpack';
  properties: BuildpackLambdaPackagingProps;
}


export interface CustomArtifactLambdaPackagingProps {
  /**
   * #### The path to a pre-built deployment package.
   *
   * ---
   *
   * If the path points to a directory or a non-zip file, Stacktape will automatically zip it for you.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: custom-artifact
  *         properties:
  *           # stp-focus
  *           packagePath: ./dist/lambda.zip
  *           # stp-end-focus
  *           handler: index.js:handler
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'custom-artifact',
  *       properties: {
  *         // stp-focus
  *         packagePath: './dist/lambda.zip',
  *         // stp-end-focus
  *         handler: 'index.js:handler'
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  packagePath: string;
  /**
   * #### The handler function to be executed when the Lambda is invoked.
   *
   * ---
   *
   * The syntax is `{{filepath}}:{{functionName}}`.
   *
   * Example: `my-lambda/index.js:default`
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: custom-artifact
  *         properties:
  *           packagePath: ./dist/lambda.zip
  *           # stp-focus
  *           handler: my-lambda/index.js:default
  *           # stp-end-focus
  *       memory: 512
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { LambdaFunction, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'custom-artifact',
  *       properties: {
  *         packagePath: './dist/lambda.zip',
  *         // stp-focus
  *         handler: 'my-lambda/index.js:default'
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  handler?: string;
}


/**
 * #### Uses a pre-built artifact for Lambda deployment.
 *
 * ---
 *
 * With `custom-artifact`, you provide a path to your own pre-built deployment package.
 * If the specified path is a directory or an unzipped file, Stacktape will automatically zip it.
 *
 * This is useful when you have custom build processes or need full control over the packaging.
 */
export interface CustomArtifactLambdaPackaging {
  type: 'custom-artifact';
  properties: CustomArtifactLambdaPackagingProps;
}


/**
 * #### Configures a pre-built container image.
 */
export interface PrebuiltImageBjPackagingProps {
  /**
   * #### The name or URL of the container image.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   encoder:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: prebuilt-image
  *           properties:
  *             # stp-focus
  *             image: jrottenberg/ffmpeg:6.1-ubuntu
  *             # stp-end-focus
  *       resources:
  *         cpu: 2
  *         memory: 7680
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const encoder = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'prebuilt-image',
  *         properties: {
  *           // stp-focus
  *           image: 'jrottenberg/ffmpeg:6.1-ubuntu'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 2,
  *       memory: 7680
  *     }
  *   });
  *   return { resources: { encoder } };
  * });
  * ```
   */
  image: string; // image name or url
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   encoder:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: prebuilt-image
  *           properties:
  *             image: jrottenberg/ffmpeg:6.1-ubuntu
  *             # stp-focus
  *             command:
  *               - -i
  *               - input.mp4
  *               - output.webm
  *             # stp-end-focus
  *       resources:
  *         cpu: 2
  *         memory: 7680
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const encoder = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'prebuilt-image',
  *         properties: {
  *           image: 'jrottenberg/ffmpeg:6.1-ubuntu',
  *           // stp-focus
  *           command: ['-i', 'input.mp4', 'output.webm']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 2,
  *       memory: 7680
  *     }
  *   });
  *   return { resources: { encoder } };
  * });
  * ```
   */
  command?: string[];
}


/**
 * #### Configures a pre-built container image.
 */
export interface PrebuiltImageCwPackagingProps extends PrebuiltImageBjPackagingProps {
  /**
   * #### The ARN of a secret containing credentials for a private container registry.
   *
   * ---
   *
   * The secret must be a JSON object with `username` and `password` keys.
   * You can create secrets using the `stacktape secret:create` command.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   privateImageService:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: prebuilt-image
  *         properties:
  *           image: registry.example.com/my-org/my-app:latest
  *           # stp-focus
  *           repositoryCredentialsSecretArn: $Secret('registry-credentials.arn')
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WebService, $Secret, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const privateImageService = new WebService({
  *     packaging: {
  *       type: 'prebuilt-image',
  *       properties: {
  *         image: 'registry.example.com/my-org/my-app:latest',
  *         // stp-focus
  *         repositoryCredentialsSecretArn: $Secret('registry-credentials.arn')
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { privateImageService } };
  * });
  * ```
   */
  repositoryCredentialsSecretArn?: string;
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   appService:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: prebuilt-image
  *         properties:
  *           image: node:22-alpine
  *           # stp-focus
  *           entryPoint:
  *             - /bin/sh
  *             - -c
  *             - node server.js
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WebService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const appService = new WebService({
  *     packaging: {
  *       type: 'prebuilt-image',
  *       properties: {
  *         image: 'node:22-alpine',
  *         // stp-focus
  *         entryPoint: ['/bin/sh', '-c', 'node server.js']
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { appService } };
  * });
  * ```
   */
  entryPoint?: string[];
}


export interface PrebuiltBjImagePackaging {
  type: 'prebuilt-image';
  properties: PrebuiltImageBjPackagingProps;
}


/**
 * #### Uses a pre-built container image.
 *
 * ---
 *
 * With `prebuilt-image`, you provide a reference to an existing container image.
 * This can be a public image from Docker Hub or a private image from any container registry.
 *
 * For private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager.
 */
export interface PrebuiltCwImagePackaging {
  type: 'prebuilt-image';
  properties: PrebuiltImageCwPackagingProps;
}


/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
export interface DockerfileBjImagePackagingProps {
  /**
   * #### The path to the Dockerfile, relative to `buildContextPath`.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             buildContextPath: ./worker
  *             # stp-focus
  *             dockerfilePath: docker/Dockerfile.prod
  *             # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           buildContextPath: './worker',
  *           // stp-focus
  *           dockerfilePath: 'docker/Dockerfile.prod'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  dockerfilePath?: string;
  /**
   * #### The path to the build context directory, relative to your Stacktape configuration file.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             # stp-focus
  *             buildContextPath: ./worker
  *             # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           // stp-focus
  *           buildContextPath: './worker'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  buildContextPath: string;
  /**
   * #### A list of arguments to pass to the `docker build` command.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             buildContextPath: ./worker
  *             # stp-focus
  *             buildArgs:
  *               - argName: NODE_ENV
  *                 value: production
  *               - argName: BUILD_VERSION
  *                 value: "1.4.2"
  *             # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           buildContextPath: './worker',
  *           // stp-focus
  *           buildArgs: [
  *             { argName: 'NODE_ENV', value: 'production' },
  *             { argName: 'BUILD_VERSION', value: '1.4.2' }
  *           ]
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  buildArgs?: DockerBuildArg[];
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   processor:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: dockerfile
  *           properties:
  *             buildContextPath: ./worker
  *             # stp-focus
  *             command:
  *               - node
  *               - dist/process.js
  *             # stp-end-focus
  *       resources:
  *         cpu: 1
  *         memory: 2048
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { BatchJob, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const processor = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'dockerfile',
  *         properties: {
  *           buildContextPath: './worker',
  *           // stp-focus
  *           command: ['node', 'dist/process.js']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { processor } };
  * });
  * ```
   */
  command?: string[];
}


/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
export interface DockerfileCwImagePackagingProps extends DockerfileBjImagePackagingProps {
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   appService:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: dockerfile
  *         properties:
  *           buildContextPath: ./app
  *           # stp-focus
  *           entryPoint:
  *             - /app/entrypoint.sh
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WebService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const appService = new WebService({
  *     packaging: {
  *       type: 'dockerfile',
  *       properties: {
  *         buildContextPath: './app',
  *         // stp-focus
  *         entryPoint: ['/app/entrypoint.sh']
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { appService } };
  * });
  * ```
   */
  entryPoint?: string[];
}


export interface DockerfileBjImagePackaging {
  type: 'dockerfile';
  properties: DockerfileBjImagePackagingProps;
}


/**
 * #### Builds a container image from your own Dockerfile.
 *
 * ---
 *
 * With `dockerfile`, you provide a path to your Dockerfile and build context.
 * Stacktape builds the image and uploads it to a managed ECR repository.
 *
 * This gives you full control over the container environment and is ideal for complex setups.
 */
export interface DockerfileCwImagePackaging {
  type: 'dockerfile';
  properties: DockerfileCwImagePackagingProps;
}


/**
 * #### Builds a container image from a project directory without a Dockerfile.
 *
 * ---
 *
 * Powered by [Railpack](https://railpack.com). The language, framework, package manager and start command are detected
 * from the project's own files: lockfiles, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`,
 * `composer.json`, `mix.exs` and version files such as `.nvmrc` or `.python-version`. Supported: Node.js (npm,
 * pnpm, yarn, bun), Python, PHP, Ruby, Go, Rust, Java, .NET, Elixir, Deno, Gleam and static sites. Every property here
 * is an override; a project that follows its ecosystem's conventions needs none of them.
 */
export interface BuildpackBjImagePackagingProps {
  /**
   * #### The directory to build, relative to the Stacktape config file. Defaults to the config file's directory.
   *
   * ---
   *
   * Files matched by the directory's `.dockerignore` are left out of the build.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           # stp-focus
   *           sourceDirectoryPath: ./api
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       // stp-focus
   *       sourceDirectoryPath: './api'
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  sourceDirectoryPath?: string;
  /**
   * #### The command that starts the application. Overrides the detected start command.
   *
   * ---
   *
   * Runs through `bash -c` in the image's `/app` directory. Web services must listen on `$PORT`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           startCommand: gunicorn --bind 0.0.0.0:$PORT app:app
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       startCommand: 'gunicorn --bind 0.0.0.0:$PORT app:app'
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  startCommand?: string;
  /**
   * #### The command that builds the application after dependencies are installed. Overrides the detected build command.
   *
   * ---
   *
   * For Node.js projects the default is the `build` script of `package.json` when one exists.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           buildCommand: npm run build:server
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       buildCommand: 'npm run build:server'
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  buildCommand?: string;
  /**
   * #### The command that installs dependencies. Overrides the detected install command.
   *
   * ---
   *
   * The default is the package manager's locked install, for example `npm ci`, `pnpm install --frozen-lockfile`
   * or `uv sync --locked`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           installCommand: npm ci --include=optional
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       installCommand: 'npm ci --include=optional'
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  installCommand?: string;
  /**
   * #### Versions of language runtimes and tools to install, by [mise](https://mise.jdx.dev) tool name.
   *
   * ---
   *
   * Use it when the project has no version file of its own. Keys are tool names such as `node`, `python`,
   * `go`, `rust`, `ruby`, `php`, `java` or `pnpm`; values are versions such as `22` or `3.12`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           packages:
   *             node: '22'
   *             pnpm: '10'
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       packages: {
   *         node: '22',
   *         pnpm: '10'
   *       }
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  packages?: Record<string, string>;
  /**
   * #### Debian packages to install with `apt`, available both during the build and at runtime.
   *
   * ---
   *
   * Common libraries such as `libpq` for PostgreSQL clients are installed automatically when the dependency
   * that needs them is detected.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           aptPackages:
   *             - ffmpeg
   *             - libvips
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       aptPackages: ['ffmpeg', 'libvips']
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  aptPackages?: string[];
  /**
   * #### Environment variables available to the install and build commands.
   *
   * ---
   *
   * They are passed as Docker build secrets: their values never appear in the image or in the build log, and a
   * changed value rebuilds the image. Runtime variables come from the resource's `environment` instead.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           buildEnvironment:
   *             - name: VITE_API_URL
   *               value: https://api.example.com
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       buildEnvironment: [{ name: 'VITE_API_URL', value: 'https://api.example.com' }]
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  buildEnvironment?: EnvironmentVar[];
  /**
   * #### Advanced: a [railpack.json](https://railpack.com/config/file) configuration merged over the detected build.
   *
   * ---
   *
   * Use it for build steps, caches or deploy settings the properties above do not cover. It takes precedence
   * over a `railpack.json` file in the source directory.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: buildpack
   *         properties:
   *           sourceDirectoryPath: ./api
   *           # stp-focus
   *           railpackConfig:
   *             steps:
   *               build:
   *                 commands:
   *                   - ...
   *                   - npx prisma generate
   *           # stp-end-focus
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new BuildpackImagePackaging({
   *       sourceDirectoryPath: './api',
   *       // stp-focus
   *       railpackConfig: {
   *         steps: { build: { commands: ['...', 'npx prisma generate'] } }
   *       }
   *       // stp-end-focus
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     }
   *   });
   *   return { resources: { apiService } };
   * });
   * ```
   */
  railpackConfig?: Record<string, unknown>;
}


/**
 * #### Builds a container image from a project directory without a Dockerfile.
 */
export interface BuildpackCwImagePackagingProps extends BuildpackBjImagePackagingProps {}


/**
 * #### Builds a container image from a project directory without a Dockerfile.
 *
 * ---
 *
 * Powered by [Railpack](https://railpack.com). Detects the language, framework, package manager and start command
 * from the project's own files. The resulting image is uploaded to a managed ECR repository.
 */
export interface BuildpackBjImagePackaging {
  type: 'buildpack';
  properties: BuildpackBjImagePackagingProps;
}


/**
 * #### Builds a container image from a project directory without a Dockerfile.
 *
 * ---
 *
 * Powered by [Railpack](https://railpack.com). Detects the language, framework, package manager and start command
 * from the project's own files. The resulting image is uploaded to a managed ECR repository.
 */
export interface BuildpackCwImagePackaging {
  type: 'buildpack';
  properties: BuildpackCwImagePackagingProps;
}


export type BatchJobContainerPackaging =
  | JsBundleBjImagePackaging
  | BuildpackBjImagePackaging
  | DockerfileBjImagePackaging
  | PrebuiltBjImagePackaging;


export type ContainerWorkloadContainerPackaging =
  | JsBundleCwImagePackaging
  | BuildpackCwImagePackaging
  | DockerfileCwImagePackaging
  | PrebuiltCwImagePackaging;


export type LambdaPackaging = JsBundleLambdaPackaging | BuildpackLambdaPackaging | CustomArtifactLambdaPackaging;
