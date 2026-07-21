interface DockerBuildArg {
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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

interface EsLanguageSpecificConfig {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             tsConfigPath: src/tsconfig.build.json
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           tsConfigPath: 'src/tsconfig.build.json'
  *           // stp-end-focus
  *         }
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/main.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             emitTsDecoratorMetadata: true
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/main.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           emitTsDecoratorMetadata: true
  *           // stp-end-focus
  *         }
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             dependenciesToExcludeFromBundle:
  *               - sharp
  *               - "@prisma/client"
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           dependenciesToExcludeFromBundle: ['sharp', '@prisma/client']
  *           // stp-end-focus
  *         }
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             outputModuleFormat: esm
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           outputModuleFormat: 'esm'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   *
   * @default 'cjs' for Node.js 23 and earlier. Node.js 24 and later use ESM output.
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             nodeVersion: 22
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           nodeVersion: 22
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   *
   * @default 24
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             disableSourceMaps: true
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           disableSourceMaps: true
  *           // stp-end-focus
  *         }
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             # stp-focus
  *             outputSourceMapsTo: ./build/sourcemaps
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           outputSourceMapsTo: './build/sourcemaps'
  *           // stp-end-focus
  *         }
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           languageSpecificConfig:
  *             dependenciesToExcludeFromBundle:
  *               - sharp
  *             # stp-focus
  *             dependenciesToExcludeFromDeploymentPackage:
  *               - "@types/node"
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
  *   const apiFunction = new LambdaFunction({
  *     packaging: {
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         languageSpecificConfig: {
  *           dependenciesToExcludeFromBundle: ['sharp'],
  *           // stp-focus
  *           dependenciesToExcludeFromDeploymentPackage: ['@types/node']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  dependenciesToExcludeFromDeploymentPackage?: string[];
}

interface PyLanguageSpecificConfig {
  /**
   * #### The path to your project's dependency file.
   *
   * ---
   *
   * This can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
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
   * #### The Python package manager to use.
   *
   * ---
   *
   * Stacktape uses `uv` for dependency resolution and installation. This option is kept
   * for compatibility and must be set to `uv` if provided.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
  *             # stp-focus
  *             packageManager: uv
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           packageManager: 'uv'
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
  packageManager?: SupportedPythonPackageManager;
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
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
  /**
   * #### The Python version the buildpack uses to create the artifact. For Lambda packaging, keep the function's `runtime` aligned with this value.
   *
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
  *             # stp-focus
  *             pythonVersion: 3.12
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           pythonVersion: 3.12
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   *
   * @default 3.12
   */
  pythonVersion?: SupportedPythonVersion;
  /**
   * #### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).
   *
   * ---
   *
   * Only for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.
   * Set `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   fastapiService:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: stacktape-image-buildpack
  *         properties:
  *           entryfilePath: app/main.py:app
  *           languageSpecificConfig:
  *             pythonVersion: 3.12
  *             # stp-focus
  *             runAppAs: ASGI
  *             # stp-end-focus
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
  *   const fastapiService = new WebService({
  *     packaging: {
  *       type: 'stacktape-image-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py:app',
  *         languageSpecificConfig: {
  *           pythonVersion: 3.12,
  *           // stp-focus
  *           runAppAs: 'ASGI'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { fastapiService } };
  * });
  * ```
   */
  runAppAs?: SupportedPythonRunAppAs;
  /**
   * #### Minify Python code to reduce package size. Makes production stack traces harder to read.
   *
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   pyApi:
  *     type: function
  *     properties:
  *       packaging:
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: app/main.py
  *           languageSpecificConfig:
  *             pythonVersion: 3.12
  *             # stp-focus
  *             minify: false
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'app/main.py',
  *         languageSpecificConfig: {
  *           pythonVersion: 3.12,
  *           // stp-focus
  *           minify: false
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { pyApi } };
  * });
  * ```
   *
   * @default true
   */
  minify?: boolean;
}

type SupportedPythonVersion = 2.7 | 3.6 | 3.7 | 3.8 | 3.9 | 3.11 | 3.12 | 3.13 | 3.14;

type SupportedPythonPackageManager = 'uv';

type SupportedPythonRunAppAs = 'WSGI' | 'ASGI';

interface JavaLanguageSpecificConfig {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/main/java/com/example/Handler.java
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/main/java/com/example/Handler.java',
  *         languageSpecificConfig: {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/main/java/com/example/Handler.java
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/main/java/com/example/Handler.java',
  *         languageSpecificConfig: {
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
  /**
   * #### The version of Java to use.
   *
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/main/java/com/example/Handler.java
  *           languageSpecificConfig:
  *             # stp-focus
  *             javaVersion: 17
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/main/java/com/example/Handler.java',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           javaVersion: 17
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { javaApi } };
  * });
  * ```
   *
   * @default 11
   */
  javaVersion?: SupportedJavaVersion;
}

type SupportedJavaVersion = 8 | 11 | 17 | 19;

interface GoLanguageSpecificConfig {}

interface RubyLanguageSpecificConfig {
  /**
   * #### The version of Ruby to use.
   *
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   rubyApi:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: stacktape-image-buildpack
  *         properties:
  *           entryfilePath: config.ru
  *           languageSpecificConfig:
  *             # stp-focus
  *             rubyVersion: 3.3
  *             # stp-end-focus
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
  *   const rubyApi = new WebService({
  *     packaging: {
  *       type: 'stacktape-image-buildpack',
  *       properties: {
  *         entryfilePath: 'config.ru',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           rubyVersion: 3.3
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { rubyApi } };
  * });
  * ```
   *
   * @default 3.3
   */
  rubyVersion?: SupportedRubyVersion;
}

type SupportedRubyVersion = 3.2 | 3.3;

interface PhpLanguageSpecificConfig {
  /**
   * #### The version of PHP to use.
   *
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   phpApi:
  *     type: web-service
  *     properties:
  *       packaging:
  *         type: stacktape-image-buildpack
  *         properties:
  *           entryfilePath: public/index.php
  *           languageSpecificConfig:
  *             # stp-focus
  *             phpVersion: 8.3
  *             # stp-end-focus
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
  *   const phpApi = new WebService({
  *     packaging: {
  *       type: 'stacktape-image-buildpack',
  *       properties: {
  *         entryfilePath: 'public/index.php',
  *         languageSpecificConfig: {
  *           // stp-focus
  *           phpVersion: 8.3
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { phpApi } };
  * });
  * ```
   *
   * @default 8.3
   */
  phpVersion?: SupportedPhpVersion;
}

type SupportedPhpVersion = 8.2 | 8.3;

interface DotnetLanguageSpecificConfig {
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/Function.cs
  *           languageSpecificConfig:
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/Function.cs',
  *         languageSpecificConfig: {
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
  /**
   * #### The version of .NET to use.
   *
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/Function.cs
  *           languageSpecificConfig:
  *             projectFile: src/Api.csproj
  *             # stp-focus
  *             dotnetVersion: 8
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/Function.cs',
  *         languageSpecificConfig: {
  *           projectFile: 'src/Api.csproj',
  *           // stp-focus
  *           dotnetVersion: 8
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     memory: 1024
  *   });
  *   return { resources: { dotnetApi } };
  * });
  * ```
   *
   * @default 8
   */
  dotnetVersion?: SupportedDotnetVersion;
}

type SupportedDotnetVersion = 6 | 8;

interface StpBuildpackSharedProps {
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
   * For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   apiFunction:
  *     type: function
  *     properties:
  *       packaging:
  *         type: stacktape-lambda-buildpack
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
  *       type: 'stacktape-lambda-buildpack',
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
  *         type: stacktape-lambda-buildpack
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
  *       type: 'stacktape-lambda-buildpack',
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
  *         type: stacktape-lambda-buildpack
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
  *       type: 'stacktape-lambda-buildpack',
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
  *         type: stacktape-lambda-buildpack
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
  *       type: 'stacktape-lambda-buildpack',
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
   * #### Language-specific packaging configuration.
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
  *         type: stacktape-lambda-buildpack
  *         properties:
  *           entryfilePath: src/handlers/api.ts
  *           # stp-focus
  *           languageSpecificConfig:
  *             nodeVersion: 22
  *             outputModuleFormat: esm
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
  *       type: 'stacktape-lambda-buildpack',
  *       properties: {
  *         entryfilePath: 'src/handlers/api.ts',
  *         // stp-focus
  *         languageSpecificConfig: {
  *           nodeVersion: 22,
  *           outputModuleFormat: 'esm'
  *         }
  *         // stp-end-focus
  *       }
  *     },
  *     memory: 512
  *   });
  *   return { resources: { apiFunction } };
  * });
  * ```
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
}

interface StpBuildpackLambdaPackagingProps extends StpBuildpackSharedProps {
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
  *         type: stacktape-lambda-buildpack
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
  *       type: 'stacktape-lambda-buildpack',
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
 * #### A zero-config buildpack that packages your code for AWS Lambda.
 *
 * ---
 *
 * The `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.
 *
 * **Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.
 *
 * For JS/TS, your code is bundled into a single file. Source maps are automatically generated.
 * Packages are cached based on a checksum, so unchanged code is not re-packaged.
 */
interface StpBuildpackLambdaPackaging {
  type: 'stacktape-lambda-buildpack';
  properties: StpBuildpackLambdaPackagingProps;
}

interface CustomArtifactLambdaPackagingProps {
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
interface CustomArtifactLambdaPackaging {
  type: 'custom-artifact';
  properties: CustomArtifactLambdaPackagingProps;
}

/**
 * #### Configures a pre-built container image.
 */
interface PrebuiltImageBjPackagingProps {
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
interface PrebuiltImageCwPackagingProps extends PrebuiltImageBjPackagingProps {
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

interface PrebuiltBjImagePackaging {
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
interface PrebuiltCwImagePackaging {
  type: 'prebuilt-image';
  properties: PrebuiltImageCwPackagingProps;
}

/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
interface CustomDockerfileBjImagePackagingProps {
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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
  *           type: custom-dockerfile
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
  *         type: 'custom-dockerfile',
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
interface CustomDockerfileCwImagePackagingProps extends CustomDockerfileBjImagePackagingProps {
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
  *         type: custom-dockerfile
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
  *       type: 'custom-dockerfile',
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

interface CustomDockerfileBjImagePackaging {
  type: 'custom-dockerfile';
  properties: CustomDockerfileBjImagePackagingProps;
}

/**
 * #### Builds a container image from your own Dockerfile.
 *
 * ---
 *
 * With `custom-dockerfile`, you provide a path to your Dockerfile and build context.
 * Stacktape builds the image and uploads it to a managed ECR repository.
 *
 * This gives you full control over the container environment and is ideal for complex setups.
 */
interface CustomDockerfileCwImagePackaging {
  type: 'custom-dockerfile';
  properties: CustomDockerfileCwImagePackagingProps;
}

interface ExternalBuildpackBjImagePackagingProps {
  /**
   * #### The Buildpack Builder to use.
   *
   * ---
   *
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   importer:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: external-buildpack
  *           properties:
  *             sourceDirectoryPath: ./importer
  *             # stp-focus
  *             builder: paketobuildpacks/builder-jammy-full
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
  *   const importer = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'external-buildpack',
  *         properties: {
  *           sourceDirectoryPath: './importer',
  *           // stp-focus
  *           builder: 'paketobuildpacks/builder-jammy-full'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { importer } };
  * });
  * ```
   *
   * @default "paketobuildpacks/builder-jammy-base"
   */
  builder?: string;
  /**
   * #### The specific Buildpack to use.
   *
   * ---
   *
   * By default, the buildpack is detected automatically.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   importer:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: external-buildpack
  *           properties:
  *             sourceDirectoryPath: ./importer
  *             # stp-focus
  *             buildpacks:
  *               - paketo-buildpacks/nodejs
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
  *   const importer = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'external-buildpack',
  *         properties: {
  *           sourceDirectoryPath: './importer',
  *           // stp-focus
  *           buildpacks: ['paketo-buildpacks/nodejs']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { importer } };
  * });
  * ```
   */
  buildpacks?: string[];
  /**
   * #### The path to the source code directory.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   importer:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: external-buildpack
  *           properties:
  *             # stp-focus
  *             sourceDirectoryPath: ./importer
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
  *   const importer = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'external-buildpack',
  *         properties: {
  *           // stp-focus
  *           sourceDirectoryPath: './importer'
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { importer } };
  * });
  * ```
   */
  sourceDirectoryPath: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * Example: `['/app/start.sh']`
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   importer:
  *     type: batch-job
  *     properties:
  *       container:
  *         packaging:
  *           type: external-buildpack
  *           properties:
  *             sourceDirectoryPath: ./importer
  *             # stp-focus
  *             command:
  *               - npm
  *               - run
  *               - import
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
  *   const importer = new BatchJob({
  *     container: {
  *       packaging: {
  *         type: 'external-buildpack',
  *         properties: {
  *           sourceDirectoryPath: './importer',
  *           // stp-focus
  *           command: ['npm', 'run', 'import']
  *           // stp-end-focus
  *         }
  *       }
  *     },
  *     resources: {
  *       cpu: 1,
  *       memory: 2048
  *     }
  *   });
  *   return { resources: { importer } };
  * });
  * ```
   */
  command?: string[];
}

interface ExternalBuildpackCwImagePackagingProps extends ExternalBuildpackBjImagePackagingProps {}

interface ExternalBuildpackBjImagePackaging {
  type: 'external-buildpack';
  properties: ExternalBuildpackBjImagePackagingProps;
}

/**
 * #### Builds a container image using an external buildpack.
 *
 * ---
 *
 * External buildpacks (buildpacks.io) automatically detect your application type
 * and build an optimized container image with zero configuration.
 *
 * The default builder is `paketobuildpacks/builder-jammy-base`.
 * You can find buildpacks for almost any language or framework.
 */
interface ExternalBuildpackCwImagePackaging {
  type: 'external-buildpack';
  properties: ExternalBuildpackCwImagePackagingProps;
}

interface NixpacksPhase {
  /**
   * #### The name of the build phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             # stp-focus
  *             - name: install
  *             # stp-end-focus
  *               cmds:
  *                 - npm ci
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             // stp-focus
  *             name: 'install',
  *             // stp-end-focus
  *             cmds: ['npm ci']
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  name: string;
  /**
   * #### A list of shell commands to execute in this phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: build
  *               # stp-focus
  *               cmds:
  *                 - npm run build
  *                 - npm prune --omit=dev
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'build',
  *             // stp-focus
  *             cmds: ['npm run build', 'npm prune --omit=dev']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  cmds?: string[];
  /**
   * #### A list of Nix packages to install in this phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: setup
  *               # stp-focus
  *               nixPkgs:
  *                 - ffmpeg
  *                 - imagemagick
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'setup',
  *             // stp-focus
  *             nixPkgs: ['ffmpeg', 'imagemagick']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  nixPkgs?: string[];
  /**
   * #### A list of Nix libraries to include in this phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: setup
  *               # stp-focus
  *               nixLibs:
  *                 - openssl
  *                 - zlib
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'setup',
  *             // stp-focus
  *             nixLibs: ['openssl', 'zlib']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  nixLibs?: string[];
  /**
   * #### A list of Nix overlay files to apply in this phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: setup
  *               # stp-focus
  *               nixOverlay:
  *                 - ./nix/overlay.nix
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'setup',
  *             // stp-focus
  *             nixOverlay: ['./nix/overlay.nix']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  nixOverlay?: string[];
  /**
   * #### The Nixpkgs archive to use.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: setup
  *               nixPkgs:
  *                 - nodejs_22
  *               # stp-focus
  *               nixpkgsArchive: bf3287dac860542719b3849d6970d22f635f9da1
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'setup',
  *             nixPkgs: ['nodejs_22'],
  *             // stp-focus
  *             nixpkgsArchive: 'bf3287dac860542719b3849d6970d22f635f9da1'
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  nixpkgsArchive?: string;
  /**
   * #### A list of APT packages to install in this phase.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: setup
  *               # stp-focus
  *               aptPkgs:
  *                 - libpq-dev
  *                 - poppler-utils
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'setup',
  *             // stp-focus
  *             aptPkgs: ['libpq-dev', 'poppler-utils']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  aptPkgs?: string[];
  /**
   * #### A list of directories to cache between builds to speed up subsequent builds.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: install
  *               cmds:
  *                 - npm ci
  *               # stp-focus
  *               cacheDirectories:
  *                 - node_modules/.cache
  *                 - /root/.npm
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'install',
  *             cmds: ['npm ci'],
  *             // stp-focus
  *             cacheDirectories: ['node_modules/.cache', '/root/.npm']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  cacheDirectories?: string[];
  /**
   * #### A list of file paths to include in this phase; all other files will be excluded.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           phases:
  *             - name: build
  *               cmds:
  *                 - npm run build
  *               # stp-focus
  *               onlyIncludeFiles:
  *                 - src
  *                 - package.json
  *               # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         phases: [
  *           {
  *             name: 'build',
  *             cmds: ['npm run build'],
  *             // stp-focus
  *             onlyIncludeFiles: ['src', 'package.json']
  *             // stp-end-focus
  *           }
  *         ]
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  onlyIncludeFiles?: string[];
}

interface NixpacksBjImagePackagingProps {
  /**
   * #### The path to the source code directory.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           # stp-focus
  *           sourceDirectoryPath: ./worker
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         // stp-focus
  *         sourceDirectoryPath: './worker'
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  sourceDirectoryPath: string;
  /**
   * #### The base image to use for building the application.
   *
   * ---
   *
   * For more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           buildImage: ubuntu:22.04
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         buildImage: 'ubuntu:22.04'
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  buildImage?: string;
  /**
   * #### A list of providers to use for determining the build and runtime environments.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           providers:
  *             - node
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         providers: ['node']
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  providers?: string[];
  /**
   * #### The command to execute when starting the application.
   *
   * ---
   *
   * This overrides the default start command inferred by Nixpacks.
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           startCmd: node dist/worker.js
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         startCmd: 'node dist/worker.js'
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  startCmd?: string;
  /**
   * #### The base image to use for running the application.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           startRunImage: gcr.io/distroless/nodejs22-debian12
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         startRunImage: 'gcr.io/distroless/nodejs22-debian12'
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  startRunImage?: string;
  /**
   * #### A list of file paths to include in the runtime environment; all other files will be excluded.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           startOnlyIncludeFiles:
  *             - dist
  *             - node_modules
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         startOnlyIncludeFiles: ['dist', 'node_modules']
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  startOnlyIncludeFiles?: string[];
  /**
   * #### The build phases for the application.
  *
  * ---
  *
  * **Example (YAML):**
  *
  * ```yaml
  * resources:
  *   worker:
  *     type: worker-service
  *     properties:
  *       packaging:
  *         type: nixpacks
  *         properties:
  *           sourceDirectoryPath: ./worker
  *           # stp-focus
  *           phases:
  *             - name: install
  *               cmds:
  *                 - npm ci
  *             - name: build
  *               cmds:
  *                 - npm run build
  *           # stp-end-focus
  *       resources:
  *         cpu: 0.5
  *         memory: 1024
  * ```
  *
  * **Example (TypeScript):**
  *
  * ```ts
  * import { WorkerService, defineConfig } from 'stacktape';
  *
  * export default defineConfig(() => {
  *   const worker = new WorkerService({
  *     packaging: {
  *       type: 'nixpacks',
  *       properties: {
  *         sourceDirectoryPath: './worker',
  *         // stp-focus
  *         phases: [
  *           { name: 'install', cmds: ['npm ci'] },
  *           { name: 'build', cmds: ['npm run build'] }
  *         ]
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { worker } };
  * });
  * ```
   */
  phases?: NixpacksPhase[];
}

interface NixpacksCwImagePackagingProps extends NixpacksBjImagePackagingProps {}

interface NixpacksBjImagePackaging {
  type: 'nixpacks';
  properties: NixpacksBjImagePackagingProps;
}

/**
 * #### Builds a container image using Nixpacks.
 *
 * ---
 *
 * Nixpacks automatically detects your application type and builds an optimized container image.
 * In most cases, no configuration is required.
 *
 * It supports a wide range of languages and frameworks out of the box.
 */
interface NixpacksCwImagePackaging {
  type: 'nixpacks';
  properties: NixpacksCwImagePackagingProps;
}

/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
interface StpBuildpackBjImagePackagingProps extends StpBuildpackSharedProps {
  /**
   * #### Language-specific packaging configuration.
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
  *         type: stacktape-image-buildpack
  *         properties:
  *           entryfilePath: src/server.ts
  *           # stp-focus
  *           languageSpecificConfig:
  *             nodeVersion: 22
  *             outputModuleFormat: esm
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
  *   const apiService = new WebService({
  *     packaging: {
  *       type: 'stacktape-image-buildpack',
  *       properties: {
  *         entryfilePath: 'src/server.ts',
  *         // stp-focus
  *         languageSpecificConfig: {
  *           nodeVersion: 22,
  *           outputModuleFormat: 'esm'
  *         }
  *         // stp-end-focus
  *       }
  *     },
  *     resources: {
  *       cpu: 0.5,
  *       memory: 1024
  *     }
  *   });
  *   return { resources: { apiService } };
  * });
  * ```
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
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
  *         type: stacktape-image-buildpack
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
  *       type: 'stacktape-image-buildpack',
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
  *         type: stacktape-image-buildpack
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
  *       type: 'stacktape-image-buildpack',
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
}

/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
interface StpBuildpackCwImagePackagingProps extends StpBuildpackBjImagePackagingProps {}

interface StpBuildpackBjImagePackaging {
  type: 'stacktape-image-buildpack';
  properties: StpBuildpackBjImagePackagingProps;
}

/**
 * #### A zero-config buildpack that creates a container image from your source code.
 *
 * ---
 *
 * The `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.
 *
 * **Supported languages:** JavaScript, TypeScript, Python, Java, and Go.
 *
 * For JS/TS, your code is bundled into a single file with source maps.
 * The resulting image is uploaded to a managed ECR repository.
 */
interface StpBuildpackCwImagePackaging {
  type: 'stacktape-image-buildpack';
  properties: StpBuildpackCwImagePackagingProps;
}
