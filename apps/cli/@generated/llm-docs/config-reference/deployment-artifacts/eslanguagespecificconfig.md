# EsLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type EsLanguageSpecificConfig = {
  /** A list of dependencies to exclude from the main bundle. */
  dependenciesToExcludeFromBundle?: Array<string>;
  /** A list of dependencies to exclude from the deployment package. */
  dependenciesToExcludeFromDeploymentPackage?: Array<string>;
  /** Skip generating source maps. Reduces package size but makes production errors harder to debug. */
  disableSourceMaps?: boolean;
  /** Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks. */
  emitTsDecoratorMetadata?: boolean;
  /** The major version of Node.js to use. */
  nodeVersion?: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
  /** Output module format: cjs (CommonJS) or esm (ES Modules, enables top-level await). */
  outputModuleFormat?: "cjs" | "esm";
  /** Save source maps to a local directory instead of uploading them to AWS. */
  outputSourceMapsTo?: string;
  /** The path to the tsconfig.json file. */
  tsConfigPath?: string;
};
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

## Property: `nodeVersion`

- Required: no
- Type: `number: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24`
- Default: `18`

The major version of Node.js to use.

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
- Default: `'cjs'`

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
