# Packaging Overview

Stacktape packaging turns your source code into a deployable artifact: a Lambda zip for functions or a container image for always-on services. Your [resource type](/configuration/resources) determines which category applies. The packaging type you choose controls how the artifact is built.

## Two packaging categories

Lambda functions and container workloads require a `packaging` configuration. The category is determined by your resource type, not chosen independently.

**Function packaging** produces a Lambda deployment zip. It applies to [Lambda functions](/resources/compute/lambda-function), [edge functions](/resources/compute/edge-function), [deployment scripts](/resources/advanced/deployment-scripts) and [custom resources](/resources/advanced/custom-resources).

**Container packaging** builds or references an OCI container image. The `js-bundle`, `buildpack` and `dockerfile` types build an image and upload it to a managed ECR repository. The `prebuilt-image` type references an existing image from Docker Hub, ECR or another registry. Container packaging applies to [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), [batch jobs](/resources/compute/batch-job) and [AgentCore runtimes](/resources/ai/agentcore-runtime).


## Feature Comparison

| Feature | Function packaging | Container packaging |
| --- | --- | --- |
| Artifact produced | Lambda deployment zip | OCI container image (built or referenced) |
| Packaging types | js-bundle, buildpack, custom-artifact | js-bundle, buildpack, dockerfile, prebuilt-image |
| Build from source without extra config | yes | yes |
| Bring your own build | Pre-built zip, directory, or non-zip file | Dockerfile or prebuilt image |


## Function packaging

Function packaging bundles your code and dependencies into a Lambda deployment zip.

| Type | Use when |
|------|----------|
| [**`js-bundle`**](/packaging/function/js-bundle) | JavaScript or TypeScript. Point to the entry file. Stacktape bundles it into one minified file with source maps, leaves the AWS SDK to the Lambda runtime, moves code shared between functions into a shared layer, and installs dependencies with native binaries separately. |
| [**`buildpack`**](/packaging/function/buildpack) | Python, Java, Go, Ruby, .NET or Rust. Point to the entry file. Stacktape installs dependencies and compiles the code in Docker on the Lambda build image of the function's `runtime`. |
| [**`custom-artifact`**](/packaging/function/custom-artifact) | You build the deployment package yourself. Provide a zip, directory or other file. Stacktape zips directories and non-zip files automatically. |

Use `custom-artifact` only when your build can't be expressed through `js-bundle` or `buildpack`, for example a custom compiler step, a monorepo build tool, or an artifact produced by a separate CI job. It accepts a `packagePath` and, optionally, a `handler` in `{{filepath}}:{{functionName}}` format.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  return { resources: { api } };
});
```


`js-bundle` options such as `nodeVersion`, `outputModuleFormat` and `disableSourceMaps` are direct properties next to `entryfilePath`. See [JS Bundle for Lambda](/packaging/function/js-bundle). For other languages, the function's `runtime` selects the language version; see [Buildpack for Lambda](/packaging/function/buildpack).

## Container packaging

Container packaging builds or references an OCI container image. Four types cover the range from a bundled Node.js entry file to a fully custom build.

| Type | Use when |
|------|----------|
| [**`js-bundle`**](/packaging/containers/js-bundle) | A JavaScript or TypeScript service with one entry file. Stacktape bundles the code and builds a small Alpine-based image. |
| [**`buildpack`**](/packaging/containers/buildpack) | Any other project: Python, Go, Rust, Java, PHP, Ruby, .NET, Elixir, or a Node.js framework such as Next.js. Stacktape detects the language, framework and start command from the project files. No Dockerfile needed. |
| [**`dockerfile`**](/packaging/containers/dockerfile) | You need a specific base image, system setup, multi-stage builds or full control over the build. Stacktape builds the image from your Dockerfile. |
| [**`prebuilt-image`**](/packaging/containers/prebuilt-image) | The image already exists in Docker Hub, ECR or a private registry. Stacktape does not build an image. |

### Choosing a container packaging type

Use **`js-bundle`** (`JsBundleImagePackaging`) for Node.js services that start from one entry file, such as Express, Hono, Fastify or NestJS. Use **`buildpack`** (`BuildpackImagePackaging`) for every other language and for frameworks with their own build output. It works without configuration for projects that follow their ecosystem's conventions, and `startCommand`, `buildCommand` and the other overrides cover the rest. Use **`dockerfile`** (`DockerfilePackaging`) when you need a specific base image, GPU drivers or a custom entrypoint. Use **`prebuilt-image`** (`PrebuiltImagePackaging`) when your CI pipeline already produces images, or for third-party software such as Redis, Nginx or Prometheus.


Example (TypeScript):

```typescript
import { defineConfig, WebService, BuildpackImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    resources: { cpu: 0.5, memory: 1024 },
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api'
    })
  });

  return { resources: { api } };
});
```


The `resources` property belongs to the web service, not to packaging. It sets CPU and memory for the container. See the [web service page](/resources/compute/web-service) for supported values and scaling options.

## Build caching

`js-bundle` and `buildpack` artifacts are cached by a checksum of their inputs. When the code, dependencies and options have not changed since the last deploy, the packaging step is skipped and the existing artifact is reused. For container `buildpack` images, dependency install layers are also cached by Docker BuildKit, so a code-only change does not reinstall dependencies. `prebuilt-image` uses the image you reference. `custom-artifact` uses the `packagePath` you provide and zips directories and non-zip files automatically.


> **Tip:** You can run packaging without deploying using [`stacktape package`](/cli/package). This is useful for testing your build configuration or for CI pipelines that separate the build and deploy steps.


## FAQ

### What's the difference between function packaging and container packaging?

Function packaging produces a Lambda deployment zip for functions that scale per request and are billed per invocation. Container packaging produces or references an OCI container image for container resources such as web services and worker services. Your resource type determines which category applies: [Lambda functions](/resources/compute/lambda-function) use function packaging, while [web services](/resources/compute/web-service) and other container resources use container packaging.

### Which packaging type should I start with?

For JavaScript and TypeScript, start with `js-bundle`, either [for Lambda](/packaging/function/js-bundle) or [for containers](/packaging/containers/js-bundle). For other languages, start with `buildpack`, either [for Lambda](/packaging/function/buildpack) or [for containers](/packaging/containers/buildpack). Switch to [`dockerfile`](/packaging/containers/dockerfile), [`custom-artifact`](/packaging/function/custom-artifact) or [`prebuilt-image`](/packaging/containers/prebuilt-image) when you need full control or already have a build pipeline.

### Which languages are supported?

- **Lambda `js-bundle`:** JavaScript and TypeScript.
- **Lambda `buildpack`:** Python, Java, Go, Ruby, .NET and Rust.
- **Container `js-bundle`:** JavaScript and TypeScript.
- **Container `buildpack`:** Node.js, Python, PHP, Ruby, Go, Rust, Java, .NET, Elixir, Deno, Gleam, C/C++, static sites and shell scripts.
- **`dockerfile` and `prebuilt-image`:** anything that runs in a container.

### Are the Lambda `buildpack` and the container `buildpack` the same?

No. Both build from source without a Dockerfile, but they are separate builders. The Lambda `buildpack` produces a zip on the Lambda build image of the function's `runtime` and uses keyed options (`python`, `java`, `dotnet`). The container `buildpack` detects the project with [Railpack](https://railpack.com) and produces a container image; its options are `startCommand`, `buildCommand`, `packages` and similar.

### How large can a Lambda deployment package be?

AWS Lambda allows 250 MB unzipped for a function and its layers. `js-bundle` keeps packages small by bundling into one minified file, leaving the runtime-provided AWS SDK out of the package, and moving code shared between functions into [a shared layer](/packaging/function/js-bundle#shared-code-between-functions). If a package still exceeds the limit, consider a container resource such as a [web service](/resources/compute/web-service); container images can be much larger.

### Where does Stacktape store container images?

The `js-bundle`, `buildpack` and `dockerfile` types upload the image to a managed ECR (Elastic Container Registry) repository. You don't need to create or configure it. With [`prebuilt-image`](/packaging/containers/prebuilt-image), you provide the name or URL of an existing image, and Stacktape does not build or push anything.

### Does Stacktape rebuild my code on every deploy?

Not always. `js-bundle` and `buildpack` reuse the previous artifact when its inputs have not changed. `dockerfile` builds use Docker's layer cache.

### I'm upgrading from Stacktape v3. What changed?

Stacktape v4 has fewer packaging types with new names, and some options moved or were removed. See [Upgrading from v3](/getting-started/upgrading-from-v3) for a before-and-after example of each change.
