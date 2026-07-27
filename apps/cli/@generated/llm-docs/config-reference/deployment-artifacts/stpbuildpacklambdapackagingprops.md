# StpBuildpackLambdaPackagingProps API Reference

## TypeScript definition

```typescript
import type { DotnetLanguageSpecificConfig, EsLanguageSpecificConfig, GoLanguageSpecificConfig, JavaLanguageSpecificConfig, PhpLanguageSpecificConfig, PyLanguageSpecificConfig, RubyLanguageSpecificConfig } from 'stacktape';

type StpBuildpackLambdaPackagingProps = {
  /** Path to your app&#39;s entry point, relative to the Stacktape config file. */
  entryfilePath: string;
  /** A list of dependencies to exclude from the deployment package. */
  excludeDependencies?: Array<string>;
  /** A glob pattern of files to explicitly exclude from the deployment package. */
  excludeFiles?: Array<string>;
  /** The name of the handler function to be executed when the Lambda is invoked. */
  handlerFunction?: string;
  /** A glob pattern of files to explicitly include in the deployment package. */
  includeFiles?: Array<string>;
  /** Language-specific packaging configuration. */
  languageSpecificConfig?: StpBuildpackLambdaPackagingLanguageSpecificConfig;
};

/** Union choices used by the properties above. */
type StpBuildpackLambdaPackagingLanguageSpecificConfig =
  | EsLanguageSpecificConfig
  | PyLanguageSpecificConfig
  | JavaLanguageSpecificConfig
  | PhpLanguageSpecificConfig
  | DotnetLanguageSpecificConfig
  | GoLanguageSpecificConfig
  | RubyLanguageSpecificConfig;
```

## Property: `entryfilePath`

- Required: yes
- Type: `string`

Path to your app's entry point, relative to the Stacktape config file.

For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).

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
     memory: 512
     timeout: 15
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/handlers/api.ts'
     }
   },
   memory: 512,
   timeout: 15
 });
 return { resources: { apiFunction } };
});
```

## Property: `excludeDependencies`

- Required: no
- Type: `Array<string>`

A list of dependencies to exclude from the deployment package.

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
         excludeDependencies:
           - aws-sdk
           - "@aws-sdk/client-s3"
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
       excludeDependencies: ['aws-sdk', '@aws-sdk/client-s3']
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `excludeFiles`

- Required: no
- Type: `Array<string>`

A glob pattern of files to explicitly exclude from the deployment package.

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
         excludeFiles:
           - "**/*.test.ts"
           - "**/__mocks__/**"
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
       excludeFiles: ['**/*.test.ts', '**/__mocks__/**']
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `handlerFunction`

- Required: no
- Type: `string`

The name of the handler function to be executed when the Lambda is invoked.

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
         handlerFunction: handler
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
       handlerFunction: 'handler'
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `includeFiles`

- Required: no
- Type: `Array<string>`

A glob pattern of files to explicitly include in the deployment package.

The path is relative to your Stacktape configuration file.

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
         includeFiles:
           - templates/**/*.html
           - config/defaults.json
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
       includeFiles: ['templates/**/*.html', 'config/defaults.json']
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `languageSpecificConfig`

- Required: no
- Type: `Es | Py | Java | Php | Dotnet | Go | Ruby`

Language-specific packaging configuration.

Choices:
- `Es` (`EsLanguageSpecificConfig`). Properties: `tsConfigPath?: string`, `emitTsDecoratorMetadata?: boolean`, `dependenciesToExcludeFromBundle?: Array<string>`, `outputModuleFormat?: string: "cjs" | "esm"`, `nodeVersion?: number: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24`, `disableSourceMaps?: boolean`, `outputSourceMapsTo?: string`, `dependenciesToExcludeFromDeploymentPackage?: Array<string>`.
- `Py` (`PyLanguageSpecificConfig`). Properties: `packageManagerFile?: string`, `packageManager?: string = "uv"`, `uvOptionalDependencies?: Array<string>`, `uvWithGroups?: Array<string>`, `uvWithoutGroups?: Array<string>`, `uvOnlyGroups?: Array<string>`, `pythonVersion?: number: 2.7 | 3.11 | 3.12 | 3.13 | 3.14 | 3.6 | 3.7 | 3.8 | 3.9`, `runAppAs?: string: "ASGI" | "WSGI"`, `minify?: boolean`.
- `Java` (`JavaLanguageSpecificConfig`). Properties: `useMaven?: boolean`, `packageManagerFile?: string`, `javaVersion?: number: 11 | 17 | 19 | 8`.
- `Php` (`PhpLanguageSpecificConfig`). Properties: `phpVersion?: number: 8.2 | 8.3`.
- `Dotnet` (`DotnetLanguageSpecificConfig`). Properties: `projectFile?: string`, `dotnetVersion?: number: 6 | 8`.
- `Go` (`GoLanguageSpecificConfig`)
- `Ruby` (`RubyLanguageSpecificConfig`). Properties: `rubyVersion?: number: 3.2 | 3.3`.

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
         nodeVersion: 22,
         outputModuleFormat: 'esm'
       }
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```
