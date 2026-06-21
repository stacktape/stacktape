# Custom Dockerfile

Custom Dockerfile packaging (`CustomDockerfilePackaging`) builds a container image from your own Dockerfile. Stacktape builds the image and uploads it to a managed ECR repository for the configured container resource. Use this mode when you need full control over system packages, multi-stage builds, or base image selection.

The packaging type has two property variants. The container workload variant (`CustomDockerfileCwImagePackagingProps`) includes `buildContextPath`, `dockerfilePath`, `buildArgs`, `command`, and `entryPoint`. The batch job variant (`CustomDockerfileBjImagePackagingProps`) shares the same properties but does not include `entryPoint`.

## When to use

Choose custom Dockerfile packaging when:

- You need system-level dependencies — native libraries or tools like `ffmpeg` or `wkhtmltopdf`.
- Your application requires a multi-stage build to keep the final image small.
- You already have a working Dockerfile and want to reuse it as-is.
- You need a specific base image (e.g., distroless, or a base image reachable by the build environment).
- Your language or framework is not covered by the [Stacktape container buildpack](/packaging/containers/stacktape-buildpack).

## When NOT to use

If your app is a standard JavaScript/TypeScript, Python, Java, or Go service, the [Stacktape container buildpack](/packaging/containers/stacktape-buildpack) automatically bundles your code and dependencies into a container image, so you do not author or maintain a Dockerfile. A custom Dockerfile adds maintenance overhead — you own base image updates, layer ordering, and security patching.

If you already have a built and pushed image in a registry, use [prebuilt image](/packaging/containers/prebuilt-image) instead — Stacktape skips the build step entirely.

The container packaging types define five image packaging modes, each with container-workload and batch-job property variants. Most teams start with the buildpack; switch to custom Dockerfile when you need precise control.

| Mode | Best for |
|------|----------|
| [Stacktape buildpack](/packaging/containers/stacktape-buildpack) | Standard apps; zero config |
| **Custom Dockerfile** | Full control over the build |
| [Prebuilt image](/packaging/containers/prebuilt-image) | Image already exists in a registry |
| [Nixpacks](/packaging/containers/nixpacks) | Auto-detected builds without a Dockerfile |
| [External buildpack](/packaging/containers/external-buildpack) | Cloud Native Buildpacks (Paketo, Heroku) |

## Basic example

The only required packaging property is `buildContextPath` — the directory sent to `docker build` as context, relative to your Stacktape config file. The `dockerfilePath` property is optional; when set, it specifies the Dockerfile path relative to `buildContextPath`. Examples below include a `resources` property — this belongs to the resource configuration (e.g., `WebService`, `BatchJob`), not the packaging type. See each resource's dedicated page for supported CPU and memory values.


Example (TypeScript):

```typescript
import { defineConfig, WebService, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return { resources: { api } };
});
```


A matching Dockerfile for a Node.js app:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "src/server.js"]
```

## Dockerfile path

The `dockerfilePath` property is optional. When set, it specifies the path to your Dockerfile relative to `buildContextPath`. This is useful when you maintain multiple Dockerfiles (development, production, CI) in the same repository or keep Dockerfiles in a subdirectory.


Example (TypeScript):

```typescript
import { defineConfig, WebService, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './',
      dockerfilePath: './docker/Dockerfile.prod'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return { resources: { api } };
});
```


In this example, `buildContextPath` is the project root (`./`), and the Dockerfile lives at `./docker/Dockerfile.prod` relative to that root. The leading `./` is conventional path syntax; Stacktape interprets `dockerfilePath` relative to `buildContextPath`.

## Build context

The `buildContextPath` property defines the directory sent to `docker build` as context. All `COPY` and `ADD` instructions in your Dockerfile resolve relative to this directory. The path itself is relative to your Stacktape config file.

A narrower build context speeds up builds because Docker transfers fewer files to the build daemon. Combine with a `.dockerignore` file to exclude directories that are not needed in the image.

```
# .dockerignore
node_modules
.git
dist
*.md
```

For monorepos, point `buildContextPath` to the service subdirectory rather than the repo root. If you need files from outside the build context (shared libraries, workspace lockfiles), restructure so they fall within the context — Docker cannot access files above the context directory.

## Build arguments

Pass values into the Dockerfile at build time using `buildArgs`. Each entry has an `argName` and a `value`. Stacktape passes `buildArgs` to `docker build`. In Docker, matching `ARG` instructions can use those values during the build; if you copy an ARG into `ENV`, the value becomes part of the runtime environment.


Example (TypeScript):

```typescript
import { defineConfig, WebService, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './',
      buildArgs: [
        { argName: 'NODE_ENV', value: 'production' },
        { argName: 'APP_VERSION', value: '2.1.0' }
      ]
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return { resources: { api } };
});
```


In the Dockerfile, declare matching `ARG` instructions to receive the values:

```dockerfile
ARG NODE_ENV=development
ARG APP_VERSION=latest

FROM node:20-alpine
ENV NODE_ENV=${NODE_ENV}
LABEL version=${APP_VERSION}
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "src/server.js"]
```

The `ARG` instruction can provide a default value that applies when no `buildArgs` override is supplied. Use this pattern so the Dockerfile works standalone (with defaults) and in Stacktape (with overrides).


> **Warning:** Do not pass secrets through `buildArgs` — they are visible in the image layer history. Use runtime configuration for secrets instead. See [secrets](/configuration/secrets) for details.


## Overriding CMD and ENTRYPOINT

You can override the Dockerfile's `CMD` and `ENTRYPOINT` instructions in the Stacktape config without modifying the Dockerfile itself.

- **`command`** overrides `CMD` — the default arguments passed to the entry point.
- **`entryPoint`** overrides `ENTRYPOINT` — the executable that runs when the container starts.


Example (TypeScript):

```typescript
import { defineConfig, WebService, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './',
      entryPoint: ['/bin/sh', '-c'],
      command: ['node src/server.js']
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return { resources: { api } };
});
```


This is useful when you use a generic base image and want to swap the start command per stage or environment without rebuilding. The container workload packaging variant includes both `entryPoint` and `command`. The batch job packaging variant supports `command` but does not include `entryPoint`.

## Multi-stage builds

Multi-stage Dockerfiles separate the build environment (compilers, dev dependencies) from the runtime image. This produces smaller, more secure containers by excluding build tools from the final layer. No special Stacktape configuration is needed — multi-stage builds work with the same `buildContextPath` and `dockerfilePath` setup.

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
```

The builder stage installs all dependencies and compiles the application. The production stage copies only the compiled output and production `node_modules`, keeping the final image small. For even smaller images, replace the production base with a distroless image and copy only the compiled artifacts.

Multi-stage builds are the recommended approach for production containers. The overhead of maintaining a longer Dockerfile is repaid by faster deploys and a smaller attack surface.

## Docker layer caching

Docker caches each image layer and reuses it when the layer's inputs have not changed. To maximize cache hits, order your Dockerfile instructions from least-frequently-changed to most-frequently-changed:

1. Base image and system packages (change rarely)
2. Dependency manifests and install step (change when you add/remove packages)
3. Application source code (changes on every commit)

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Dependencies change less often than source code
COPY package*.json ./
RUN npm ci --omit=dev

# Source code — changes frequently
COPY . .
CMD ["node", "src/server.js"]
```

By copying `package.json` and running `npm ci` before copying the rest of the source, Docker reuses the cached dependency layer whenever only application code changes. This is standard Dockerfile hygiene and helps whenever the build environment has a warm cache. Stacktape's custom Dockerfile packaging controls only the Dockerfile, build context, args, command, and entry point — caching behavior depends on Docker itself.

## Using with batch jobs

The batch job custom Dockerfile variant (`CustomDockerfileBjImagePackaging`) supports `command` but does not include `entryPoint`. See [batch job](/resources/compute/batch-job) for the full resource configuration.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, Bucket, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const outputBucket = new Bucket({});

  const processor = new BatchJob({
    container: {
      packaging: new CustomDockerfilePackaging({
        buildContextPath: './job'
      })
    },
    resources: {
      cpu: 2,
      memory: 8000
    },
    connectTo: [outputBucket]
  });

  return { resources: { outputBucket, processor } };
});
```


## Using with multi-container workloads

A [multi-container workload](/resources/compute/multi-container-workload) defines multiple containers, each with its own packaging. This example uses `CustomDockerfilePackaging` for both containers, each pointing to a separate build context. You can also mix packaging modes — for example, one container with a custom Dockerfile and another with a [prebuilt image](/packaging/containers/prebuilt-image). See [multi-container workload](/resources/compute/multi-container-workload) for the full resource configuration.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './api'
        })
      },
      {
        name: 'worker',
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './worker',
          dockerfilePath: './Dockerfile.worker'
        })
      }
    ],
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return { resources: { workload } };
});
```


## Best practices

These are general Docker best practices that apply to any custom Dockerfile used with Stacktape. The Stacktape-specific properties are `buildContextPath`, `dockerfilePath`, `buildArgs`, `command`, and `entryPoint` — everything else is standard Dockerfile authoring.

**Keep images small.** Use Alpine-based or distroless base images. Multi-stage builds prevent build tools from bloating the final layer. Smaller images deploy faster and reduce ECR storage costs.

**Use `.dockerignore`.** Exclude `node_modules`, `.git`, build artifacts, and test files from the build context. This speeds up the context transfer to the Docker daemon and prevents accidental inclusion of sensitive files.

**Pin base image versions.** Use `node:20.11-alpine` instead of `node:latest`. Pinned versions make builds reproducible and prevent unexpected breakage from upstream updates.

**Order layers by change frequency.** Copy dependency manifests and install dependencies before copying application code. This lets Docker reuse the dependency layer across code-only changes. See [Docker layer caching](#docker-layer-caching) above.

**Do not run as root.** Add a `USER` instruction in the final stage to switch to a non-root user:

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

**Combine related `RUN` instructions.** Each `RUN` creates a new image layer. Combine related commands with `&&` to reduce layer count. Clean up package manager caches in the same `RUN` instruction that installs packages — otherwise the cache persists in an earlier layer even after deletion.

## FAQ

### What base images can I use?

Your Dockerfile can use the same `FROM` syntax as a normal Docker build. Common choices include official language images (`node:20-alpine`, `python:3.12-slim`) and distroless images from Google for minimal attack surface. The custom Dockerfile packaging properties (`CustomDockerfileCwImagePackagingProps`) expose `buildContextPath`, `dockerfilePath`, `buildArgs`, `command`, and `entryPoint` — there is no property for configuring private-registry credentials at build time. If you need Stacktape to reference an already-built image from a private registry, use [prebuilt image](/packaging/containers/prebuilt-image) packaging instead — `PrebuiltImageCwPackagingProps` exposes `repositoryCredentialsSecretArn` for that purpose.

### How does Stacktape handle the built image?

Stacktape builds the image and uploads it to a managed ECR repository. The repository is managed by Stacktape as part of your stack — you point to your Dockerfile and build context, and Stacktape handles the image build and upload.

### How do I pass runtime secrets to the container?

Do not use `buildArgs` for secrets — they are visible in image layer history. Instead, use runtime configuration for secrets so they are not baked into the image. See [secrets](/configuration/secrets) for details on referencing secrets at runtime.

### How does custom Dockerfile differ from the Stacktape container buildpack?

The [Stacktape container buildpack](/packaging/containers/stacktape-buildpack) automatically bundles your code and dependencies into a container image, so you do not author or maintain a Dockerfile. It supports JavaScript, TypeScript, Python, Java, and Go. Custom Dockerfile gives you full control but requires you to manage base image updates, layer ordering, and security patching yourself. Use the buildpack for standard apps; use a custom Dockerfile when you need system-level dependencies, multi-stage builds, or unsupported runtimes.

### When should I use a prebuilt image instead?

Use [prebuilt image](/packaging/containers/prebuilt-image) packaging when your image is already built and pushed to a container registry — whether by your CI pipeline, a shared team registry, or a third-party vendor. Stacktape skips the build step entirely and pulls the image at deploy time. This is the right choice when your build pipeline lives outside Stacktape.

### What is the maximum container image size?

AWS ECR does not enforce a hard image size limit. However, larger images increase deploy time because more data must be pulled when a new task starts. As a general guideline, keep web-facing images small — teams often target a few hundred MB so tasks spend less time pulling layers. Batch jobs can tolerate larger images because startup latency is less critical.

### Can I use multi-stage Docker builds?

Yes. Multi-stage Dockerfiles work with no additional Stacktape configuration. They are the recommended approach for production images because they separate build-time dependencies (compilers, dev tools) from the runtime, producing smaller and more secure images. See [Multi-stage builds](#multi-stage-builds) above for a working example.

### How do I debug a failing Docker build?

Run `docker build` locally with the same build context path and Dockerfile to reproduce the error outside Stacktape. Check that all files referenced by `COPY` instructions exist within the build context and are not excluded by `.dockerignore`. During deployment, check the deployment output for the Docker build step to identify the failure.

### How do I speed up Docker image builds?

Docker caches image layers and reuses unchanged layers on subsequent builds. Order your Dockerfile instructions from least-frequently-changed (base image, system packages) to most-frequently-changed (application code). Copy dependency manifests and install before copying source files. Use a `.dockerignore` to minimize build context size. See [Docker layer caching](#docker-layer-caching) for a worked example.

### Can I override CMD or ENTRYPOINT without modifying the Dockerfile?

Yes. Set the `command` property to override the Dockerfile's `CMD` and `entryPoint` to override `ENTRYPOINT`. This lets you change the container's start command per stage or environment without rebuilding. The batch job packaging variant supports `command` but not `entryPoint`. See [Overriding CMD and ENTRYPOINT](#overriding-cmd-and-entrypoint) for usage.

The API reference below covers the container workload variant (`CustomDockerfileCwImagePackagingProps`), used by [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload). The batch job variant (`CustomDockerfileBjImagePackagingProps`) shares the same properties — `buildContextPath`, `dockerfilePath`, `buildArgs`, and `command` — but does not include `entryPoint`.


## API Reference: `CustomDockerfileCwImagePackagingProps`
Configures an image to be built by Stacktape from a specified Dockerfile.

```typescript
import type { DockerBuildArg } from 'stacktape';

type CustomDockerfileCwImagePackagingProps = {
  /** The path to the build context directory, relative to your Stacktape configuration file. */
  buildContextPath: string;
  /** A list of arguments to pass to the docker build command. */
  buildArgs?: Array<DockerBuildArg>;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
  /** The path to the Dockerfile, relative to buildContextPath. */
  dockerfilePath?: string;
  /** A script to be executed when the container starts. */
  entryPoint?: Array<string>;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `buildContextPath` | yes | `string` | The path to the build context directory, relative to your Stacktape configuration file. | - |
| `buildArgs` | no | `Array<DockerBuildArg>` | A list of arguments to pass to the `docker build` command. | - |
| `command` | no | `Array<string>` | A command to be executed when the container starts. This overrides the `CMD` instruction in the Dockerfile.

Example: `['/app/start.sh']` | - |
| `dockerfilePath` | no | `string` | The path to the Dockerfile, relative to `buildContextPath`. | - |
| `entryPoint` | no | `Array<string>` | A script to be executed when the container starts. This overrides the `ENTRYPOINT` instruction in the Dockerfile. | - |
