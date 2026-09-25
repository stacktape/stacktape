# EsLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type EsLanguageSpecificConfig = {
  /** Bundle the AWS SDK from your `node_modules` instead of using the copy the Lambda runtime provides. */
  bundleAwsSdk?: boolean;
  /** A list of dependencies to exclude from the main bundle. */
  dependenciesToExcludeFromBundle?: Array<string>;
  /** A list of dependencies to exclude from the deployment package. */
  dependenciesToExcludeFromDeploymentPackage?: Array<string>;
  /** Skip generating source maps. Reduces package size but makes production errors harder to debug. */
  disableSourceMaps?: boolean;
  /** Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.

Source maps are disabled for this artifact because the decorator transform and bundler cannot yet compose their
mappings accurately. Emitting a map would give production stack traces incorrect line numbers. */
  emitTsDecoratorMetadata?: boolean;
  /** Minify the bundled code. Local names are kept, so stack traces stay readable. */
  minify?: boolean;
  /** Also shorten local variable and function names when minifying. */
  minifyIdentifiers?: boolean;
  /** The major version of Node.js the buildpack uses to create the artifact. For Lambda packaging, keep the function's `runtime` aligned with this value. */
  nodeVersion?: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
  /** Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`). */
  outputModuleFormat?: "cjs" | "esm";
  /** Save source maps to a local directory instead of uploading them to AWS. */
  outputSourceMapsTo?: string;
  /** The path to the `tsconfig.json` file. */
  tsConfigPath?: string;
};
```

## Property: `bundleAwsSdk`

- Required: no
- Type: `boolean`
- Default: `false`

Bundle the AWS SDK from your `node_modules` instead of using the copy the Lambda runtime provides.

The Node.js 18+ Lambda runtimes ship the AWS SDK v3. By default, imports of `@aws-sdk/client-*` and
`@aws-sdk/lib-*` packages are left out of the deployment package and resolved from the runtime, which keeps the
package smaller. The runtime's copy can be older than the version in your `package.json`. Enable this when your
code needs a newer SDK than the runtime ships. Container workloads have no runtime-provided SDK and always
bundle it.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handlers/api.ts
          languageSpecificConfig:
            bundleAwsSdk: true
      memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/handlers/api.ts',
        languageSpecificConfig: {
          bundleAwsSdk: true
        }
      }
    },
    memory: 512
  });
  return { resources: { apiFunction } };
});
```

## Property: `dependenciesToExcludeFromBundle`

- Required: no
- Type: `Array<string>`

A list of dependencies to exclude from the main bundle.

These dependencies will be treated as "external" and will not be bundled directly into your application's code.
Instead, they will be installed separately in the deployment package.
Use `*` to exclude all dependencies from the bundle.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           dependenciesToExcludeFromBundle:
             - sharp
             - "@prisma/client"
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         dependenciesToExcludeFromBundle: ['sharp', '@prisma/client']
       }
     }
   },
   memory: 1024
 });
 return { resources: { apiFunction } };
});
```

## Property: `dependenciesToExcludeFromDeploymentPackage`

- Required: no
- Type: `Array<string>`

A list of dependencies to exclude from the deployment package.

This only applies to dependencies that are not statically bundled.
To exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.
Use `*` to exclude all non-bundled dependencies.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           dependenciesToExcludeFromBundle:
             - sharp
           dependenciesToExcludeFromDeploymentPackage:
             - "@types/node"
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         dependenciesToExcludeFromBundle: ['sharp'],
         dependenciesToExcludeFromDeploymentPackage: ['@types/node']
       }
     }
   },
   memory: 1024
 });
 return { resources: { apiFunction } };
});
```

## Property: `disableSourceMaps`

- Required: no
- Type: `boolean`

Skip generating source maps. Reduces package size but makes production errors harder to debug.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           disableSourceMaps: true
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         disableSourceMaps: true
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `emitTsDecoratorMetadata`

- Required: no
- Type: `boolean`

Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.

Source maps are disabled for this artifact because the decorator transform and bundler cannot yet compose their
mappings accurately. Emitting a map would give production stack traces incorrect line numbers.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/main.ts
         languageSpecificConfig:
           emitTsDecoratorMetadata: true
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/main.ts',
       languageSpecificConfig: {
         emitTsDecoratorMetadata: true
       }
     }
   },
   memory: 1024
 });
 return { resources: { apiFunction } };
});
```

## Property: `minify`

- Required: no
- Type: `boolean`
- Default: `true`

Minify the bundled code. Local names are kept, so stack traces stay readable.

Whitespace is removed and syntax is shortened. Local variable and function names are kept, so stack traces and
error messages read as your source does. Shortening the names as well is a separate opt-in, `minifyIdentifiers`.
Set `minify: false` to deploy the bundle as written.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handlers/api.ts
          languageSpecificConfig:
            minify: false
      memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/handlers/api.ts',
        languageSpecificConfig: {
          minify: false
        }
      }
    },
    memory: 512
  });
  return { resources: { apiFunction } };
});
```

## Property: `minifyIdentifiers`

- Required: no
- Type: `boolean`
- Default: `false`

Also shorten local variable and function names when minifying.

Produces a slightly smaller bundle, but local names disappear from stack traces and from error messages
(`TypeError: Ln is not a function`), and the short names change with every build. Stacktape Console groups
runtime errors by message and function name, so the same error would open a new issue after each deployment.
Has no effect when `minify` is `false`.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handlers/api.ts
          languageSpecificConfig:
            minifyIdentifiers: true
      memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/handlers/api.ts',
        languageSpecificConfig: {
          minifyIdentifiers: true
        }
      }
    },
    memory: 512
  });
  return { resources: { apiFunction } };
});
```

## Property: `nodeVersion`

- Required: no
- Type: `number: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24`

The major version of Node.js the buildpack uses to create the artifact. For Lambda packaging, keep the function's `runtime` aligned with this value.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           nodeVersion: 22
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         nodeVersion: 22
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `outputModuleFormat`

- Required: no
- Type: `string: "cjs" | "esm"`

Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).

**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           outputModuleFormat: esm
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         outputModuleFormat: 'esm'
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `outputSourceMapsTo`

- Required: no
- Type: `string`

Save source maps to a local directory instead of uploading them to AWS.

Useful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           outputSourceMapsTo: ./build/sourcemaps
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         outputSourceMapsTo: './build/sourcemaps'
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `tsConfigPath`

- Required: no
- Type: `string`

The path to the `tsconfig.json` file.

This is primarily used to resolve path aliases during the build process.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/handlers/api.ts
         languageSpecificConfig:
           tsConfigPath: src/tsconfig.build.json
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts',
       languageSpecificConfig: {
         tsConfigPath: 'src/tsconfig.build.json'
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```
