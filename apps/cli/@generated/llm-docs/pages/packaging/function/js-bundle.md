# JS Bundle for Lambda

The `js-bundle` packaging type (`JsBundleLambdaPackaging`) packages a JavaScript or TypeScript [Lambda function](/resources/compute/lambda-function) from its entry file. Stacktape bundles the entry file and everything it imports into one minified file with source maps, installs the dependencies that cannot be bundled, and uploads the result.

`js-bundle` supports JavaScript and TypeScript only. For Python, Java, Go, Ruby, .NET and Rust functions, use [`buildpack`](/packaging/function/buildpack).

## When to use

Use `js-bundle` for every JavaScript or TypeScript Lambda function unless you already build the deployment package yourself: API handlers, event processors, scheduled tasks and webhooks.

Use [`custom-artifact`](/packaging/function/custom-artifact) instead when:

- You have a pre-built zip from a separate CI pipeline or build tool.
- Your build needs steps that the bundler does not support.
- You need to include artifacts generated outside your project tree.

For container resources ([web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), [batch jobs](/resources/compute/batch-job)), see [container `js-bundle`](/packaging/containers/js-bundle).

## Basic example

`entryfilePath` is the only required property. It is relative to the Stacktape configuration file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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

## Entry file

`entryfilePath` points to the file that contains the handler, relative to the Stacktape configuration file. Stacktape bundles the code starting from this file into one output file. Use `dependenciesToExcludeFromBundle` to keep selected packages out of the bundle. They are installed separately in the deployment package, which is often needed for packages with native binaries.

## Handler function

The `handlerFunction` property names the exported function to execute when the Lambda is invoked. Set it when your entry file exports a specifically named handler function.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const processOrder = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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

`includeFiles`, `excludeFiles` and `excludeDependencies` control what goes into the deployment package. Code is bundled starting from the entry file. Use `includeFiles` for runtime files that are not pulled in by the bundler, and `excludeFiles` to remove matched files from the deployment package. These options are useful when your function reads files at runtime that aren't statically imported (templates, configuration files, ML models, data files).

### Including additional files

The `includeFiles` property explicitly includes files matched by glob patterns in the deployment package. Paths are relative to your Stacktape config file. Use this for any file your handler reads at runtime via the filesystem (e.g., `fs.readFile`) rather than through an `import`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const emailSender = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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

## Bundling options

All options are properties of `JsBundleLambdaPackaging` next to `entryfilePath`. See the [API reference](#api-reference) for the complete list.

### How the bundle is built

Stacktape bundles your code starting from the entry file into a single output file. The bundle is minified (whitespace and syntax only, so function names stay readable in stack traces), and on Node.js 18 and later, imports of `@aws-sdk/client-*` and `@aws-sdk/lib-*` are left out of the package because the Lambda runtime provides them. Source maps are generated automatically. If you set `outputSourceMapsTo`, source maps are saved locally instead of uploaded, and CloudWatch stack traces will not be mapped.

Key options:

- **`nodeVersion`** — major Node.js version used to build the bundle. Supported: 16, 17, 18, 19, 20, 21, 22, 23, 24. Default: `24`. This does not replace the Lambda resource's `runtime`; set both to matching versions when overriding the default.
- **`outputModuleFormat`** — `'cjs'` (CommonJS) or `'esm'` (ES Modules, enables top-level `await`). Node.js 24 and later use ESM output; with earlier Node.js versions the default is CommonJS. Edge functions remain CommonJS. Some npm packages don't support ESM, and ESM may produce less readable stack traces.
- **`tsConfigPath`** — path to your `tsconfig.json`, used to resolve path aliases during bundling.
- **`emitTsDecoratorMetadata`** — enable for frameworks that rely on TypeScript decorator metadata reflection (NestJS, TypeORM).
- **`dependenciesToExcludeFromBundle`** — packages treated as external (not bundled into the single output file). They're installed separately in the deployment package. Set the array to `['*']` to exclude all dependencies from the bundle.
- **`dependenciesToExcludeFromDeploymentPackage`** — removes non-bundled dependencies from the final package. Only applies to dependencies already excluded from the bundle. Set the array to `['*']` to exclude all non-bundled dependencies.
- **`disableSourceMaps`** — skips source map generation, reducing package size but making production errors harder to debug.
- **`outputSourceMapsTo`** — saves source maps to a local directory instead of uploading them to AWS. Useful for external error tracking tools like Sentry or Datadog. CloudWatch stack traces won't be mapped when this is set.
- **`minify`** — minifies the bundle (whitespace and syntax). Local function and variable names are kept, so stack traces and error messages stay readable. Default: `true`.
- **`minifyIdentifiers`** — also shortens local variable and function names. Slightly smaller bundle, but the names disappear from stack traces and error messages and change with every build, so Stacktape Console cannot group the same error across deployments. Default: `false`.
- **`bundleAwsSdk`** — bundles `@aws-sdk/*` from your `node_modules` instead of using the copy the Lambda runtime provides. Enable it when you need a newer SDK than the runtime ships. Default: `false`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    runtime: 'nodejs22.x',
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/api.ts',
      nodeVersion: 22,
      outputModuleFormat: 'esm',
      dependenciesToExcludeFromBundle: ['@prisma/client'],
      tsConfigPath: './tsconfig.json'
    }),
    memory: 1024,
    timeout: 30
  });

  return {
    resources: { api }
  };
});
```


This example sets both `runtime: 'nodejs22.x'` on the Lambda function and `nodeVersion: 22` in its packaging config. The former selects the AWS Lambda runtime; the latter selects the Node.js version the bundle targets. Keep them aligned. Because Node.js 22 otherwise defaults to CommonJS, `outputModuleFormat: 'esm'` explicitly enables ES Module output. Use `dependenciesToExcludeFromBundle` for dependencies you do not want statically bundled — excluded dependencies are installed separately in the deployment package, which is the safer path for packages with native binaries like `@prisma/client`. Setting `tsConfigPath` lets the bundler resolve TypeScript path aliases during bundling.


> **Info:** Use `dependenciesToExcludeFromBundle` for dependencies with native binaries. Excluded dependencies are installed separately in the deployment package rather than being statically bundled. This is the most common fix when a dependency works locally but fails in Lambda with a binary-related error.


## Build caching

Stacktape caches deployment packages based on a checksum, so unchanged code is not re-packaged. This makes iterative deployments faster when only some functions have changed. Caching works automatically with no configuration needed.

## Shared code between functions

When a stack has two or more JavaScript or TypeScript Lambda functions that can be packaged together, it builds them in a single pass and moves the code they have in common — your own modules and their npm dependencies — into [Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html) that those functions share. Each function package then contains only its own code. Nothing needs to be configured, and your imports do not change.

The effect grows with the number of functions. Twenty-five functions that share a library and the AWS SDK produce twenty-five small packages plus one layer, instead of twenty-five packages that each carry a full copy of the shared code.

Stacktape creates at most three layers, leaving two of Lambda's five layer slots for layers you attach yourself. Code that only one function uses is never moved into a layer.

### When a function is packaged on its own

A function is packaged individually, without a shared layer, when it uses an option the shared build cannot honor:

- [tracing](/observability/tracing) is enabled for it (its handler is wrapped at the bundle entry)
- `outputModuleFormat: 'cjs'`
- `emitTsDecoratorMetadata: true`
- `outputSourceMapsTo`
- `dependenciesToExcludeFromDeploymentPackage`
- `includeFiles` or `excludeFiles`
- a `nodeVersion` other than 18, 20, 22 or 24

Functions also have to agree with each other to share a build. Architecture, `nodeVersion`, `tsConfigPath`, `disableSourceMaps`, `minify`, `minifyIdentifiers`, `bundleAwsSdk`, `dependenciesToExcludeFromBundle` and `excludeDependencies` must match; functions that differ are grouped separately. The largest group shares a build and the rest are packaged individually, so one unusual function no longer costs the others their shared layer.


> **Info:** Changing shared code changes every package that depends on it, because each function's entry file references the shared chunk by a content hash. Changing one handler's own code changes only that one package.


## Processor architecture

`JsBundleLambdaPackaging` does not expose an architecture setting. Configure architecture on the [Lambda function resource](/resources/compute/lambda-function); see that page for details. If your function uses native binary dependencies, verify they ship builds compatible with your chosen architecture before switching.

## API reference


### Definition: `JsBundleLambdaPackagingProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `JsBundleLambdaPackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `entryfilePath` | yes | `string` | - |
| `bundleAwsSdk` | no | `boolean` | `false` |
| `dependenciesToExcludeFromBundle` | no | `Array<string>` | - |
| `dependenciesToExcludeFromDeploymentPackage` | no | `Array<string>` | - |
| `disableSourceMaps` | no | `boolean` | - |
| `emitTsDecoratorMetadata` | no | `boolean` | - |
| `excludeDependencies` | no | `Array<string>` | - |
| `excludeFiles` | no | `Array<string>` | - |
| `handlerFunction` | no | `string` | - |
| `includeFiles` | no | `Array<string>` | - |
| `minify` | no | `boolean` | `true` |
| `minifyIdentifiers` | no | `boolean` | `false` |
| `nodeVersion` | no | `number: 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 24` | - |
| `outputModuleFormat` | no | `string: "cjs" \| "esm"` | - |
| `outputSourceMapsTo` | no | `string` | - |
| `tsConfigPath` | no | `string` | - |


## FAQ

### Should I use `js-bundle` or a custom artifact?

Use `js-bundle` for most projects. It handles bundling and artifact creation with minimal configuration. Use [custom artifact packaging](/packaging/function/custom-artifact) when you already have a pre-built zip from an external build pipeline, need a custom toolchain the bundler doesn't support, or want full control over the deployment package contents.

### Can I use ES Modules (ESM)?

Yes. Node.js 24 and later use ES Module output automatically. With an earlier Node.js version, set `outputModuleFormat: 'esm'`; ESM also enables top-level `await`. Edge functions remain CommonJS. Some npm packages don't support ESM, and ESM can produce less readable stack traces — test your function after switching to catch compatibility issues.

### What is the maximum Lambda deployment package size?

AWS Lambda allows 250 MB unzipped for a function and all its layers together. Its 50 MB zipped limit applies only to direct uploads; Stacktape deploys code through S3, so it doesn't apply. `js-bundle` keeps packages small on its own: it bundles to a single minified file, leaves the runtime-provided AWS SDK out, and moves code shared between functions into [a shared layer](#shared-code-between-functions). `excludeFiles` and `excludeDependencies` trim further. If your dependencies still cannot fit, consider moving the workload to a container resource such as a [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), or [batch job](/resources/compute/batch-job).

### How do I handle native binary dependencies like sharp or Prisma?

Add native binary packages to `dependenciesToExcludeFromBundle`. Excluded dependencies are installed separately in the deployment package rather than being statically bundled. If a dependency works locally but fails in Lambda with a binary error, excluding it from the bundle is usually the fix.

### My function runs an older AWS SDK than the one in my package.json — why?

On Node.js 18 and later, the Lambda runtime ships the AWS SDK v3, and `js-bundle` leaves `@aws-sdk/client-*` and `@aws-sdk/lib-*` imports out of the package so they resolve from the runtime. The runtime's copy can lag behind npm. If your code needs a newer SDK, set `bundleAwsSdk: true` to bundle the version from your `node_modules`.

### Why does my stack contain Lambda layers I did not configure?

When several functions can be packaged together, Stacktape moves the code they share into layers so each package carries only its own code. This is automatic. See [shared code between functions](#shared-code-between-functions) for what goes into a layer and which options keep a function off that path.

### How do I debug a function packaged with `js-bundle`?

Source maps are generated automatically and included in the deployment package so CloudWatch stack traces map back to your source. If you set `outputSourceMapsTo`, source maps are saved locally instead and CloudWatch stack traces will not be mapped. For rapid iteration without a full redeploy, use [dev mode](/local-development/dev-mode-overview) with Lambda functions.
