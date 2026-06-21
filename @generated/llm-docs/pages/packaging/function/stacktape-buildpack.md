# Stacktape Buildpack for Lambda

The Stacktape Lambda buildpack (`StacktapeLambdaBuildpackPackaging`) packages source code into an optimized AWS Lambda deployment artifact with minimal configuration. Set `entryfilePath` to your app's entry point — Stacktape bundles your code and dependencies, generates source maps (JS/TS), and uploads the result. This packaging mode applies to [Lambda function](/resources/compute/lambda-function) resources and supports JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.

## When to use

Use the Stacktape Lambda buildpack when you want the fastest path from source code to a deployed [Lambda function](/resources/compute/lambda-function). It handles bundling and artifact creation with minimal configuration. This is the right choice for most Lambda-based projects — API handlers, event processors, scheduled tasks, webhook endpoints, and background functions.

Choose the buildpack if:

- You want minimal-config packaging from a source file
- You're using a supported language with standard dependency management
- You don't need a custom build pipeline or post-processing steps beyond what the buildpack provides

| Criteria | Stacktape buildpack | [Custom artifact](/packaging/function/custom-artifact) |
|---|---|---|
| Build handled by | Stacktape (automatic) | You (external pipeline) |
| Input | Source file path | Pre-built zip or directory |
| Languages | JS, TS, Python, Java, Go, Ruby, PHP, .NET | Any (you build it) |
| Best for | Most projects | Custom toolchains, pre-compiled artifacts |

## When NOT to use

Use [custom artifact packaging](/packaging/function/custom-artifact) instead when:

- You have a pre-built zip from a separate CI pipeline or build tool
- Your build process requires steps the buildpack doesn't support (cross-compilation with custom toolchains, proprietary build tools)
- You need to include artifacts generated outside your project tree

For container-based workloads ([web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), [batch jobs](/resources/compute/batch-job)), see [container packaging](/packaging/containers/stacktape-buildpack) instead. Lambda packaging applies only to `LambdaFunction` resources.

## Basic example

The smallest valid Stacktape Lambda buildpack configuration points to your entry file. Stacktape bundles your code and dependencies into the deployment package.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  return {
    resources: { api }
  };
});
```


The handler file exports a function that AWS Lambda invokes:

```typescript
export const handler = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from Lambda' })
  };
};
```

## Supported languages

The buildpack supports eight languages. All configuration beyond `entryfilePath` is optional — defaults work for most projects.

| Language | Entry file example | Default runtime version | Key config options |
|---|---|---|---|
| JavaScript / TypeScript | `./src/handler.ts` | Node.js 18 | `nodeVersion`, `outputModuleFormat`, `tsConfigPath` |
| Python | `./src/handler.py` | Python 3.9 | `pythonVersion`, `packageManagerFile`, `minify` |
| Java | `./src/Handler.java` | Java 11 | `javaVersion`, `useMaven`, `packageManagerFile` |
| Go | `./src/main.go` | — | — |
| Ruby | `./src/handler.rb` | Ruby 3.3 | `rubyVersion` |
| PHP | `./src/handler.php` | PHP 8.3 | `phpVersion` |
| .NET | `./src/Handler.cs` | .NET 8 | `dotnetVersion`, `projectFile` |

For detailed language-specific tuning — runtime versions, module format, dependency exclusions, and build tool configuration — see the [Language-specific configuration](#language-specific-configuration) section below.

## Entry file

The `entryfilePath` property (required) tells the buildpack where your Lambda handler code lives. The path is relative to your Stacktape config file. For JS/TS, the buildpack bundles your code starting from this file into a single output file. Use `dependenciesToExcludeFromBundle` to treat selected packages as external — excluded dependencies are installed separately in the deployment package. This is often useful for packages with native binaries.

For Python, use the standard file path format: `./src/handler.py`. For Java and Go, set `entryfilePath` to the source entry point for the function.

## Handler function

The `handlerFunction` property names the exported function to execute when the Lambda is invoked. Set it when your entry file exports a specifically named handler function.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const processOrder = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/orders.ts',
      handlerFunction: 'processOrder'
    }),
    memory: 512,
    timeout: 30
  });

  return {
    resources: { processOrder }
  };
});
```


The `memory` and `timeout` properties in these examples are [`LambdaFunction`](/resources/compute/lambda-function) settings, not packaging options — they are included here for realistic context.

The handler file would export the named function:

```typescript
export const processOrder = async (event: any) => {
  // process the order
  return { statusCode: 200, body: 'Order processed' };
};
```

## Including and excluding files

The Stacktape Lambda buildpack supports `includeFiles`, `excludeFiles`, and `excludeDependencies` to control what goes into the deployment package. For JS/TS, code is bundled starting from the entry file — use `includeFiles` for runtime files that are not pulled in by the bundler, and `excludeFiles` to remove matched files from the deployment package. These options are useful when your function reads files at runtime that aren't statically imported (templates, configuration files, ML models, data files).

### Including additional files

The `includeFiles` property explicitly includes files matched by glob patterns in the deployment package. Paths are relative to your Stacktape config file. Use this for any file your handler reads at runtime via the filesystem (e.g., `fs.readFile`) rather than through an `import`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const emailSender = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/email-sender.ts',
      includeFiles: ['./templates/**/*.html', './config/email-config.json']
    }),
    memory: 256,
    timeout: 15
  });

  return {
    resources: { emailSender }
  };
});
```


### Excluding files

The `excludeFiles` property explicitly excludes files matched by glob patterns from the deployment package. This is useful when `includeFiles` globs are broader than intended, or when your project tree contains large files (test fixtures, documentation, local data) that would otherwise be included.

### Excluding dependencies

The `excludeDependencies` property lists dependencies to exclude from the deployment package. Use it when you know a dependency is not needed at runtime. Smaller packages can reduce cold start times, so exclude dependencies you do not need at runtime.

## Language-specific configuration

The `languageSpecificConfig` property tunes how the buildpack handles your specific language and runtime. Each language has its own set of options. The subsections below cover the most commonly adjusted settings; see the [API reference](#api-reference) for the complete property listing.

### Node.js and TypeScript

For JavaScript and TypeScript projects, the buildpack bundles your code starting from the entry file into a single output file. Source maps are generated automatically. If you set `outputSourceMapsTo`, source maps are saved locally instead of uploaded, and CloudWatch stack traces will not be mapped.

Key options:

- **`nodeVersion`** — major Node.js version to target. Supported: 16, 17, 18, 19, 20, 21, 22, 23, 24. Default: `18`.
- **`outputModuleFormat`** — `'cjs'` (CommonJS, default) or `'esm'` (ES Modules, enables top-level `await`). Some npm packages don't support ESM, and ESM may produce less readable stack traces.
- **`tsConfigPath`** — path to your `tsconfig.json`, used to resolve path aliases during bundling.
- **`emitTsDecoratorMetadata`** — enable for frameworks that rely on TypeScript decorator metadata reflection (NestJS, TypeORM).
- **`dependenciesToExcludeFromBundle`** — packages treated as external (not bundled into the single output file). They're installed separately in the deployment package. Set the array to `['*']` to exclude all dependencies from the bundle.
- **`dependenciesToExcludeFromDeploymentPackage`** — removes non-bundled dependencies from the final package. Only applies to dependencies already excluded from the bundle. Set the array to `['*']` to exclude all non-bundled dependencies.
- **`disableSourceMaps`** — skips source map generation, reducing package size but making production errors harder to debug.
- **`outputSourceMapsTo`** — saves source maps to a local directory instead of uploading them to AWS. Useful for external error tracking tools like Sentry or Datadog. CloudWatch stack traces won't be mapped when this is set.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts',
      languageSpecificConfig: {
        nodeVersion: 22,
        outputModuleFormat: 'esm',
        dependenciesToExcludeFromBundle: ['@prisma/client'],
        tsConfigPath: './tsconfig.json'
      }
    }),
    memory: 1024,
    timeout: 30
  });

  return {
    resources: { api }
  };
});
```


Setting `nodeVersion: 22` targets Node.js 22 instead of the default 18. `outputModuleFormat: 'esm'` enables ES Module output; choose this when you need top-level `await` or your dependencies are ESM-only. Use `dependenciesToExcludeFromBundle` for dependencies you do not want statically bundled — excluded dependencies are installed separately in the deployment package, which is the safer path for packages with native binaries like `@prisma/client`. Setting `tsConfigPath` lets the buildpack resolve TypeScript path aliases during bundling.


> **Info:** Use `dependenciesToExcludeFromBundle` for dependencies with native binaries. Excluded dependencies are installed separately in the deployment package rather than being statically bundled. This is the most common fix when a dependency works locally but fails in Lambda with a binary-related error.


### Python

For Python, Stacktape uses `uv` for dependency resolution and installation. Set `packageManagerFile` to point to your `requirements.txt`, `Pipfile`, or `pyproject.toml`.

Key options:

- **`pythonVersion`** — Python runtime version. Supported: 2.7, 3.6, 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14. Default: `3.9`.
- **`packageManagerFile`** — path to your dependency file (`requirements.txt`, `Pipfile`, or `pyproject.toml`).
- **`packageManager`** — kept for compatibility. If set, must be `'uv'`. Stacktape uses `uv` for dependency resolution and installation by default, so you typically omit this.
- **`minify`** — minifies Python code to reduce package size. Makes production stack traces harder to read. Default: `true`. Disable when readable deployed source is more important than smaller package size.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const dataProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process.py',
      languageSpecificConfig: {
        pythonVersion: 3.12,
        packageManagerFile: './requirements.txt',
        minify: false
      }
    }),
    memory: 512,
    timeout: 60
  });

  return {
    resources: { dataProcessor }
  };
});
```


Setting `pythonVersion: 3.12` explicitly targets the Python 3.12 Lambda runtime (the default is 3.9). The `packageManagerFile` tells the buildpack where to find your dependencies — point it to your `requirements.txt`, `Pipfile`, or `pyproject.toml`. Setting `minify: false` disables Python source minification, which keeps your deployed source readable for debugging.


> **Warning:** Python minification is enabled by default and can reduce package size, but it makes production stack traces harder to read. Disable it (`minify: false`) when readable deployed source is more important than smaller package size.


### Java

The buildpack builds Java projects using Gradle by default. Set `useMaven: true` to switch to Maven.

Key options:

- **`javaVersion`** — Java runtime version. Supported: 8, 11, 17, 19. Default: `11`.
- **`useMaven`** — use Maven instead of Gradle for building.
- **`packageManagerFile`** — path to `pom.xml` (Maven) or `build.gradle` (Gradle).


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/main/java/Handler.java',
      languageSpecificConfig: {
        javaVersion: 17,
        useMaven: true,
        packageManagerFile: './pom.xml'
      }
    }),
    memory: 1024,
    timeout: 60
  });

  return {
    resources: { processor }
  };
});
```


Setting `javaVersion: 17` explicitly targets the Java 17 runtime (the default is 11). Java Lambda functions tend to have longer cold starts than interpreted languages due to JVM startup. Choose Maven or Gradle based on your project setup; Stacktape uses Gradle by default, and `useMaven: true` selects Maven.

### Other languages

The remaining supported languages require minimal or no language-specific configuration:

- **Go** — no language-specific configuration needed. Point `entryfilePath` to your Go source file.
- **Ruby** — `rubyVersion` sets the Ruby runtime (supported: 3.2, 3.3; default: `3.3`).
- **PHP** — `phpVersion` sets the PHP runtime (supported: 8.2, 8.3; default: `8.3`).
- **.NET** — `dotnetVersion` sets the .NET runtime (supported: 6, 8; default: `8`). Use `projectFile` to point to your .NET project file (typically `.csproj`).

The following example shows a .NET Lambda function with `dotnetVersion` and `projectFile` configured:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const dotnetApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/Handler.cs',
      languageSpecificConfig: {
        dotnetVersion: 8,
        projectFile: './src/MyFunction.csproj'
      }
    }),
    memory: 512,
    timeout: 30
  });

  return {
    resources: { dotnetApi }
  };
});
```


Setting `dotnetVersion: 8` targets the .NET 8 runtime (the default). The `projectFile` property points to your .NET project file (typically `.csproj`).

See the [API reference](#api-reference) for the full set of language-specific properties.

## Build caching

The Stacktape Lambda buildpack caches deployment packages based on a checksum, so unchanged code is not re-packaged. This makes iterative deployments faster when only some functions have changed. Caching works automatically with no configuration needed.

## Processor architecture

`StacktapeLambdaBuildpackPackaging` does not expose an architecture setting. Configure architecture on the [Lambda function resource](/resources/compute/lambda-function); see that page for details. If your function uses native binary dependencies, verify they ship builds compatible with your chosen architecture before switching.

## API reference


## API Reference: `StpBuildpackLambdaPackagingProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `entryfilePath` | yes | `string` | Path to your app&#39;s entry point, relative to the Stacktape config file. For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI). | - |
| `excludeDependencies` | no | `Array<string>` | A list of dependencies to exclude from the deployment package. | - |
| `excludeFiles` | no | `Array<string>` | A glob pattern of files to explicitly exclude from the deployment package. | - |
| `handlerFunction` | no | `string` | The name of the handler function to be executed when the Lambda is invoked. | - |
| `includeFiles` | no | `Array<string>` | A glob pattern of files to explicitly include in the deployment package. The path is relative to your Stacktape configuration file. | - |
| `languageSpecificConfig` | no | `Es \| Py \| Java \| Php \| Dotnet \| Go \| Ruby` | Language-specific packaging configuration. | - |


## FAQ

### What languages does the Stacktape Lambda buildpack support?

The buildpack supports JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET. All configuration beyond `entryfilePath` is optional — the defaults handle bundling and artifact creation for each language. See the [Language-specific configuration](#language-specific-configuration) section for all tuning options.

### Should I use the Stacktape buildpack or a custom artifact?

Use `StacktapeLambdaBuildpackPackaging` for most projects — it handles bundling and artifact creation with minimal configuration. Use [custom artifact packaging](/packaging/function/custom-artifact) when you already have a pre-built zip from an external build pipeline, need a custom toolchain the buildpack doesn't support, or want full control over the deployment package contents.

### Can I use ES Modules (ESM) with the Lambda buildpack?

Yes. Set `outputModuleFormat: 'esm'` in `languageSpecificConfig` to enable ES Module output, which also enables top-level `await`. The default is `'cjs'` (CommonJS). Some npm packages don't support ESM, and ESM can produce less readable stack traces — test your function after switching to catch compatibility issues.

### What is the maximum Lambda deployment package size?

Underneath, AWS Lambda enforces deployment package size limits (50 MB zipped for direct upload, 250 MB unzipped). The buildpack's single-file bundling (for JS/TS), `excludeFiles`, and `excludeDependencies` options help keep packages small. Stacktape `LambdaFunction` packaging supports the Stacktape Lambda buildpack and custom artifacts. If your dependencies cannot fit within these limits, consider moving the workload to a container resource such as a [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), or [batch job](/resources/compute/batch-job).

### How do I handle native binary dependencies like sharp or Prisma?

Add native binary packages to `dependenciesToExcludeFromBundle` in your Node.js/TypeScript `languageSpecificConfig`. Excluded dependencies are installed separately in the deployment package rather than being statically bundled. If a dependency works locally but fails in Lambda with a binary error, excluding it from the bundle is usually the fix.

### Does the buildpack support TypeScript path aliases?

Yes. Set `tsConfigPath` in `languageSpecificConfig` to point to your `tsconfig.json`. Stacktape uses that file to resolve path aliases during the build process.

### How does Lambda cold start relate to package size?

Larger deployment packages increase cold start duration because AWS Lambda must download and extract the package before your function can execute. The buildpack minimizes this by bundling JS/TS code into a single file and letting you exclude unnecessary files and dependencies via `excludeFiles` and `excludeDependencies`. Exclude files and dependencies you do not need at runtime to reduce download and extraction work during cold starts.

### Can I deploy the same code as both a Lambda function and a container?

Yes, but you need different packaging configurations. [Lambda function](/resources/compute/lambda-function) resources use `StacktapeLambdaBuildpackPackaging` (this page), which produces a zip artifact. Container workloads like [web services](/resources/compute/web-service) use [container packaging](/packaging/containers/stacktape-buildpack) (`StacktapeImageBuildpackPackaging`), which produces an OCI image. Your application code can be shared, but the packaging configuration and entry point conventions differ between the two.

### How do I debug a Lambda function packaged with the buildpack?

For JavaScript and TypeScript, source maps are generated automatically and included in the deployment package. If you set `outputSourceMapsTo`, source maps are saved locally instead and CloudWatch stack traces will not be mapped. Use [`stacktape debug:logs`](/cli/debug-logs) to tail function logs from the CLI. For rapid iteration without full redeployment, use [dev mode](/local-development/dev-mode-overview) with Lambda functions.

### When should I use arm64 (Graviton) vs x86_64 for Lambda?

`StacktapeLambdaBuildpackPackaging` does not expose an architecture setting — configure it on the [Lambda function resource](/resources/compute/lambda-function). Per AWS documentation, Graviton-based Lambda functions (`arm64`) may offer better price-performance for most workloads. Stick with `x86_64` if you depend on native binary packages that only ship x86 builds. See the [Lambda function](/resources/compute/lambda-function) page for details.
