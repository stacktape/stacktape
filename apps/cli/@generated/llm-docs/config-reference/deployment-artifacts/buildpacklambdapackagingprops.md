# BuildpackLambdaPackagingProps API Reference

Builds a Python, Java, Go, Ruby, .NET or Rust Lambda function from its source.

## TypeScript definition

```typescript
import type { DotnetBuildpackConfig, JavaBuildpackConfig, PythonBuildpackConfig } from 'stacktape';

type BuildpackLambdaPackagingProps = {
  /** Path to your app's entry point, relative to the Stacktape config file. */
  entryfilePath: string;
  /** .NET options. Applies when `entryfilePath` is a `.cs` file. */
  dotnet?: DotnetBuildpackConfig;
  /** A glob pattern of files to explicitly exclude from the deployment package. */
  excludeFiles?: Array<string>;
  /** The name of the handler function to be executed when the Lambda is invoked. */
  handlerFunction?: string;
  /** A glob pattern of files to explicitly include in the deployment package. */
  includeFiles?: Array<string>;
  /** Java options. Applies when `entryfilePath` is a `.java` file. */
  java?: JavaBuildpackConfig;
  /** Python options. Applies when `entryfilePath` is a `.py` file. */
  python?: PythonBuildpackConfig;
};
```

## Property: `entryfilePath`

- Required: yes
- Type: `string`

Path to your app's entry point, relative to the Stacktape config file.

The file extension selects the language: `.py`, `.java`, `.go`, `.rb`, `.cs` or `.rs`. Dependencies are
installed from the nearest dependency file (`pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`,
`go.mod`, `Gemfile`, `*.csproj`, `Cargo.toml`) and the build runs in Docker on the Lambda build image of the
function's `runtime`.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: js-bundle
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
     type: 'js-bundle',
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

## Property: `dotnet`

- Required: no
- Type: `DotnetBuildpackConfig`

.NET options. Applies when `entryfilePath` is a `.cs` file.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: buildpack
        properties:
          entryfilePath: src/Function.cs
          dotnet:
            projectFile: src/Function.csproj
      runtime: dotnet8
```

### Example 2 (typescript)

```typescript
import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: 'src/Function.cs',
      dotnet: {
        projectFile: 'src/Function.csproj'
      }
    }),
    runtime: 'dotnet8'
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
       type: js-bundle
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
     type: 'js-bundle',
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
       type: js-bundle
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
     type: 'js-bundle',
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
       type: js-bundle
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
     type: 'js-bundle',
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

## Property: `java`

- Required: no
- Type: `JavaBuildpackConfig`

Java options. Applies when `entryfilePath` is a `.java` file.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: buildpack
        properties:
          entryfilePath: src/main/java/com/example/Handler.java
          java:
            useMaven: true
      runtime: java21
```

### Example 2 (typescript)

```typescript
import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: 'src/main/java/com/example/Handler.java',
      java: {
        useMaven: true
      }
    }),
    runtime: 'java21'
  });
  return { resources: { apiFunction } };
});
```

## Property: `python`

- Required: no
- Type: `PythonBuildpackConfig`

Python options. Applies when `entryfilePath` is a `.py` file.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: buildpack
        properties:
          entryfilePath: app/main.py
          python:
            uvWithGroups:
              - lambda
      runtime: python3.12
```

### Example 2 (typescript)

```typescript
import { BuildpackLambdaPackaging, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: 'app/main.py',
      python: {
        uvWithGroups: ['lambda']
      }
    }),
    runtime: 'python3.12'
  });
  return { resources: { apiFunction } };
});
```
