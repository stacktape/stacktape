# StpBuildpackCwImagePackagingProps API Reference

Configures an image to be built automatically by Stacktape from your source code.

## TypeScript definition

```typescript
import type { DotnetLanguageSpecificConfig, EsLanguageSpecificConfig, GoLanguageSpecificConfig, JavaLanguageSpecificConfig, PhpLanguageSpecificConfig, PyLanguageSpecificConfig, RubyLanguageSpecificConfig } from 'stacktape';

type StpBuildpackCwImagePackagingProps = {
  /** Path to your app&#39;s entry point, relative to the Stacktape config file. */
  entryfilePath: string;
  /** A list of commands to be executed during the docker build process. */
  customDockerBuildCommands?: Array<string>;
  /** A list of dependencies to exclude from the deployment package. */
  excludeDependencies?: Array<string>;
  /** A glob pattern of files to explicitly exclude from the deployment package. */
  excludeFiles?: Array<string>;
  /** A glob pattern of files to explicitly include in the deployment package. */
  includeFiles?: Array<string>;
  /** Language-specific packaging configuration. */
  languageSpecificConfig?: StpBuildpackCwImagePackagingLanguageSpecificConfig;
  /** Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc. */
  requiresGlibcBinaries?: boolean;
};

/** Union choices used by the properties above. */
type StpBuildpackCwImagePackagingLanguageSpecificConfig =
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

## Property: `customDockerBuildCommands`

- Required: no
- Type: `Array<string>`

A list of commands to be executed during the `docker build` process.

These commands are executed using the `RUN` directive in the Dockerfile.
This is useful for installing additional system dependencies in your container.

### Example 1 (yaml)

```yaml
resources:
 imageProcessor:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: src/server.ts
         customDockerBuildCommands:
           - apt-get update && apt-get install -y poppler-utils
           - fc-cache -f
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const imageProcessor = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'src/server.ts',
       customDockerBuildCommands: [
         'apt-get update && apt-get install -y poppler-utils',
         'fc-cache -f'
       ]
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { imageProcessor } };
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
 apiService:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: src/server.ts
         languageSpecificConfig:
           nodeVersion: 22
           outputModuleFormat: esm
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiService = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'src/server.ts',
       languageSpecificConfig: {
         nodeVersion: 22,
         outputModuleFormat: 'esm'
       }
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { apiService } };
});
```

## Property: `requiresGlibcBinaries`

- Required: no
- Type: `boolean`

Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.

Results in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.

### Example 1 (yaml)

```yaml
resources:
 imageProcessor:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: src/server.ts
         requiresGlibcBinaries: true
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const imageProcessor = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'src/server.ts',
       requiresGlibcBinaries: true
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { imageProcessor } };
});
```
