# Packaging Overview

Stacktape packaging turns your source code into a deployable artifact — a Lambda zip for serverless functions or a container image for always-on services. Your [resource type](/configuration/resources) determines which category applies. The packaging mode you choose controls how that artifact gets built, from zero-config buildpacks to fully custom Dockerfiles.

## Two packaging categories

Lambda functions and container workloads require a `packaging` configuration. The packaging category is determined by your resource type — not something you choose independently.

**Function packaging** produces a Lambda deployment zip optimized for serverless execution. It applies to [Lambda functions](/resources/compute/lambda-function).

**Container packaging** produces or references an OCI container image for container-based compute resources. The Stacktape image buildpack and custom Dockerfile modes build an image and upload it to a managed ECR repository. The prebuilt-image mode provides the name or URL of an existing image from Docker Hub, ECR, or another registry. Container packaging applies to [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), and [batch jobs](/resources/compute/batch-job).


## Feature Comparison

| Feature | Function packaging | Container packaging |
| --- | --- | --- |
| Artifact produced | Lambda deployment zip | OCI container image (built or referenced) |
| Available modes | 2 | 5 |
| Zero-config option | yes | yes |
| Custom build support | Pre-built zip, directory, or non-zip file | Dockerfile, prebuilt image, Nixpacks, Cloud Native Buildpacks |


## Function packaging

Function packaging bundles your code and dependencies into a Lambda deployment zip. Two modes are available — most projects should use the Stacktape buildpack.

| Mode | Use when |
|------|----------|
| [**Stacktape buildpack**](/packaging/function/stacktape-buildpack) | **Recommended.** Point to your source file — Stacktape handles bundling, source maps, and dependency installation. For JS/TS, code is bundled into a single file and dependencies with native binaries are installed separately. Supports JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET. |
| [**Custom artifact**](/packaging/function/custom-artifact) | You have your own build process and want to provide a pre-built deployment package. Provide a zip, directory, or other file — Stacktape zips directories and non-zip files automatically. |

The Stacktape buildpack is the right choice for most projects. For JavaScript and TypeScript, it bundles your code into a single file with auto-generated source maps, and installs dependencies with native binaries separately. For Python, the `packageManagerFile` property can point to a `requirements.txt`, `Pipfile`, or `pyproject.toml` file. For Java, it supports both Gradle and Maven. Switch to custom artifact only when your build process can't be expressed through the buildpack's configuration — for example, when you need a custom compiler step, a monorepo build tool, or an artifact produced by a separate CI job. Custom artifact accepts a `packagePath` pointing to your pre-built zip, directory, or file, and optionally a `handler` in `{{filepath}}:{{functionName}}` format to set the Lambda handler explicitly.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  return { resources: { api } };
});
```


Fine-tune language settings (Node.js version, Python version, module format, source maps) through the `languageSpecificConfig` property — see the [Stacktape buildpack page](/packaging/function/stacktape-buildpack) for details.

## Container packaging

Container packaging builds or references an OCI container image for container-based compute. The Stacktape image buildpack and custom Dockerfile modes build an image and push it to a managed ECR repository; prebuilt-image mode provides the name or URL of an existing image from an external registry. Five modes cover the range from zero-config to fully custom.

| Mode | Use when |
|------|----------|
| [**Stacktape buildpack**](/packaging/containers/stacktape-buildpack) | **Recommended for most projects.** Point to your source file — Stacktape automatically bundles your code and dependencies into a container image. Supports JavaScript, TypeScript, Python, Java, and Go. |
| [**Custom Dockerfile**](/packaging/containers/custom-dockerfile) | You need custom system packages, a specific base image, or full control over the build. Stacktape builds the image from your Dockerfile and uploads it to a managed ECR repository. Standard Dockerfile features — including multi-stage builds — can be used. |
| [**Prebuilt image**](/packaging/containers/prebuilt-image) | You already have a container image in Docker Hub, ECR, or a private registry. Provide the image name or URL — Stacktape does not build an image in this mode. |
| [**Nixpacks**](/packaging/containers/nixpacks) | You want automatic language/framework detection without writing a Dockerfile. Supports a wide range of languages. |
| [**External buildpack**](/packaging/containers/external-buildpack) | You want to use Cloud Native Buildpacks (buildpacks.io). Default builder is `paketobuildpacks/builder-jammy-base`. |

### Deciding between container modes

Start with the **Stacktape buildpack** (`StacktapeImageBuildpackPackaging`) for JavaScript, TypeScript, Python, Java, or Go projects — it automatically bundles your code and dependencies into a container image with no configuration beyond pointing to your source file. Switch to a **custom Dockerfile** (`CustomDockerfilePackaging`) when you need system-level control: custom OS packages, non-standard runtimes, or specific base images. Use a **prebuilt image** (`PrebuiltImagePackaging`) when your CI pipeline already produces container images, or you're running third-party software like Redis, Nginx, or Prometheus. Choose **Nixpacks** (`NixpacksPackaging`) when working with languages the Stacktape buildpack doesn't cover and you want automatic language/framework detection without writing a Dockerfile. Choose **external buildpack** (`ExternalBuildpackPackaging`) when you specifically want Cloud Native Buildpacks (buildpacks.io) or need a particular builder or buildpack — the default builder is `paketobuildpacks/builder-jammy-base`.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/app.ts'
        })
      }
    ]
  });

  return { resources: { api } };
});
```


The `resources` property belongs to the web service resource, not to packaging — it controls CPU and memory allocation for the container. See the [web service page](/resources/compute/web-service) for supported values and scaling options.

## Build caching

The Stacktape Lambda buildpack caches packages based on a content checksum — if your code and dependencies haven't changed since the last deploy, the packaging step is skipped and the existing artifact is reused. Packaging outputs include a content digest and an outcome (`skipped` or `bundled`), but checksum-based skip behavior is documented only for the Stacktape Lambda buildpack. In prebuilt-image mode, you provide the name or URL of an existing container image instead of configuring Stacktape to build one from source. Custom artifact mode uses the `packagePath` you provide; if that path points to a directory or non-zip file, Stacktape zips it automatically.


> **Tip:** You can run packaging without deploying using [`stacktape package-workloads`](/cli/package-workloads). This is useful for testing your build configuration or for CI pipelines that separate the build and deploy steps.


## FAQ

### What's the difference between function packaging and container packaging?

Function packaging produces a Lambda deployment zip for serverless functions that scale per-request and charge per-invocation. Container packaging produces or references an OCI container image for Stacktape container resources such as web services and worker services. Your resource type determines which category applies — [Lambda functions](/resources/compute/lambda-function) use function packaging, while [web services](/resources/compute/web-service) and other container resources use container packaging.

### Which packaging mode should I start with?

Start with the Stacktape buildpack. Both the [Lambda buildpack](/packaging/function/stacktape-buildpack) and the [container image buildpack](/packaging/containers/stacktape-buildpack) use `entryfilePath` as the required input and expose language-specific options when you need to tune runtime or packaging behavior. Only switch to another mode when you hit a specific limitation, like needing custom system packages ([custom Dockerfile](/packaging/containers/custom-dockerfile)) or having a pre-existing build pipeline ([custom artifact](/packaging/function/custom-artifact) or [prebuilt image](/packaging/containers/prebuilt-image)).

### What languages does the Stacktape buildpack support?

The [Lambda buildpack](/packaging/function/stacktape-buildpack) supports JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET. The [container image buildpack](/packaging/containers/stacktape-buildpack) supports JavaScript, TypeScript, Python, Java, and Go. For languages not covered by the Stacktape buildpack, use a [custom Dockerfile](/packaging/containers/custom-dockerfile) for full container control, or [Nixpacks](/packaging/containers/nixpacks) for wider language and framework detection.

### Can I bring my own Dockerfile?

Yes. The [custom Dockerfile](/packaging/containers/custom-dockerfile) mode lets you provide your own Dockerfile and build context. Stacktape builds the image from your Dockerfile and uploads it to a managed ECR repository. You can pass build arguments and override the start command and entrypoint. Standard Dockerfile features — including multi-stage builds — can be used.

### How large can a Lambda deployment package be?

AWS Lambda has deployment package size limits that can constrain large applications. The Stacktape buildpack helps by bundling JavaScript and TypeScript into a single file with source maps generated separately. If your package exceeds AWS limits, consider moving to a container-based resource like a [web service](/resources/compute/web-service) — container images can be significantly larger.

### Where does Stacktape store container images?

The Stacktape image buildpack and custom Dockerfile modes upload the resulting image to a managed ECR (Elastic Container Registry) repository — you don't need to create or configure ECR manually. Nixpacks and external buildpack modes also build container images during deployment. When using a [prebuilt image](/packaging/containers/prebuilt-image), you provide the name or URL of an existing container image — Stacktape does not build or push an image in this mode.

### Does Stacktape rebuild my code on every deploy?

Not always. The Stacktape Lambda buildpack caches packages based on a content checksum and skips re-packaging when your code and dependencies haven't changed — the packaging outcome is `skipped` instead of `bundled`. Packaging output types include a `digest` field, but checksum-based skip behavior is documented only for the Stacktape Lambda buildpack.

### Can I use ARM architecture for container images?

The packaging internals support `linux/amd64` and `linux/arm64` as Docker build output architectures. This overview does not document a public packaging-level architecture setting. Check the relevant compute resource page (e.g. [web service](/resources/compute/web-service)) for how to configure architecture for your workload.

### When should I use Nixpacks vs the Stacktape buildpack?

The [Stacktape buildpack](/packaging/containers/stacktape-buildpack) is purpose-built for Stacktape and automatically bundles your code and dependencies into a container image for its supported languages (JavaScript, TypeScript, Python, Java, Go). [Nixpacks](/packaging/containers/nixpacks) provides automatic language and framework detection for a wider set of languages. Use Nixpacks when the Stacktape buildpack doesn't support your language, or when you want framework-specific detection without writing a Dockerfile.

### Lambda function vs container service — which should I choose?

This decision is about your [resource type](/configuration/resources), not packaging. [Lambda functions](/resources/compute/lambda-function) scale to zero, charge per-invocation, and work well for APIs, event handlers, and intermittent workloads with execution times under 15 minutes. [Container services](/resources/compute/web-service) run continuously, suit high-throughput APIs and WebSocket connections, and give you more control over the runtime. Once you've chosen a resource type, the packaging category follows automatically.
