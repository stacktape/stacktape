# External Buildpack

External buildpack packaging uses [Cloud Native Buildpacks](https://buildpacks.io) to automatically detect your application's language and framework, then build an OCI container image — no Dockerfile required. You point Stacktape at your source directory and configure a builder; the buildpack handles dependency installation, compilation, and image layering.

External buildpack packaging applies to container-based resources: [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), and [batch jobs](/resources/compute/batch-job).

## When to use

External buildpack packaging is a good fit when:

- Your language or framework has a mature Cloud Native Buildpack ecosystem (Java/Spring, Go, Ruby, .NET, Python, Node.js, PHP).
- You want the buildpack community's opinionated image structure — layered caching and dependency management — without writing a Dockerfile.
- You're migrating from Heroku or another platform that uses buildpacks. The same builders (Paketo, Heroku) work with Stacktape.
- You need language or framework support beyond what the [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) and [Nixpacks](/packaging/containers/nixpacks) cover — external buildpacks exist for almost any language or framework.

## When NOT to use

- **For most Stacktape projects, the [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) is a better default.** It bundles your code and dependencies into an optimized container image with tighter Stacktape integration and supports JavaScript/TypeScript, Python, Java, and Go.
- If you need precise control over image layers, system packages, or multi-stage builds, use a [custom Dockerfile](/packaging/containers/custom-dockerfile) instead.
- If you already have a container image in a registry, use [prebuilt image](/packaging/containers/prebuilt-image) to skip the build step entirely.
- [Nixpacks](/packaging/containers/nixpacks) is an alternative auto-detection builder with a different language matrix — compare if your stack isn't well-supported by Cloud Native Buildpacks.

## Basic example

The smallest valid external buildpack configuration. Stacktape uses the default Paketo builder (`paketobuildpacks/builder-jammy-base`) to auto-detect the language and produce an image. The `resources` block (`cpu`, `memory`) is required by the [WebService](/resources/compute/web-service) resource, not by the packaging itself.


Example (TypeScript):

```typescript
import { defineConfig, WebService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './app'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { api }
  };
});
```


## Source directory

The `sourceDirectoryPath` property (required) specifies the directory containing your application source code, relative to the Stacktape config file. The builder reads this directory to detect the language, install dependencies, and compile the application.

The directory should contain the files the buildpack expects for your language — for example, `package.json` for Node.js, `requirements.txt` or `pyproject.toml` for Python, `pom.xml` or `build.gradle` for Java, or `go.mod` for Go. The builder auto-detects the language from these files.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './backend'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { worker }
  };
});
```


## Builder

The `builder` property controls which Cloud Native Buildpack builder image produces your container. A builder bundles a set of buildpacks and a base OS image. If omitted, Stacktape defaults to `paketobuildpacks/builder-jammy-base`.

Specify a custom builder when the default doesn't support your language, you need extra system libraries, or you're migrating from a platform that provides its own builder (like Heroku). The `builder` property accepts any valid builder image reference — consult the builder provider's documentation for current language support and version compatibility.

| Builder | Notes |
|---------|-------|
| `paketobuildpacks/builder-jammy-base` | **Default.** General-purpose Paketo builder on Ubuntu 22.04. Configured by Stacktape when `builder` is omitted. |
| `paketobuildpacks/builder-jammy-full` | Paketo builder with extra system libraries for native dependencies. |
| `heroku/builder:24` | Heroku's builder — useful for teams migrating from Heroku. |
| `gcr.io/buildpacks/builder:google-22` | Google Cloud buildpacks builder. |


> **Info:** Only `paketobuildpacks/builder-jammy-base` is the Stacktape-configured default. The other builders listed above are commonly used external options — consult each builder's documentation for current language support and available buildpacks.


Example (TypeScript):

```typescript
import { defineConfig, WebService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './app',
      builder: 'heroku/builder:24'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { api }
  };
});
```


## Buildpacks

By default, the builder auto-detects which buildpacks to apply based on your source directory contents. Use the optional `buildpacks` array to override auto-detection when it picks the wrong buildpack or you need one the builder doesn't include by default.

Specify buildpacks as strings — the exact format depends on the builder ecosystem (buildpack IDs, URIs, or image references are all common in the Cloud Native Buildpack standard). Consult your builder's documentation for available buildpack identifiers.


Example (TypeScript):

```typescript
import { defineConfig, WebService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './app',
      buildpacks: ['paketo-buildpacks/nodejs']
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { api }
  };
});
```


When multiple buildpacks are specified, the CNB spec runs them in the listed order. This is useful for composite setups — for example, adding a CA certificates buildpack before the main language buildpack.

## Start command

The `command` property overrides the default process that runs when the container starts. The buildpack normally determines the start command automatically (for example, `node server.js` for Node.js or the compiled binary for Go). Use `command` only when the buildpack's default doesn't match your needs — such as starting a different entry point or passing runtime flags.


Example (TypeScript):

```typescript
import { defineConfig, WebService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './app',
      command: ['node', 'dist/server.js']
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { api }
  };
});
```


## How it works

Cloud Native Buildpacks store dependencies in a separate image layer from application code. When dependencies haven't changed between deploys, the builder can reuse the cached dependency layer and only rebuild the application layer — reducing build time on subsequent deploys. The `ExternalBuildpackPackaging` configuration surface does not expose explicit cache controls; whether a given build reuses prior layers depends on the builder and the build environment.

## Complete example

A more realistic configuration showing all available properties — a Java Spring Boot service using a Heroku builder with an explicit buildpack and a custom start command. The `resources` block (`cpu`, `memory`) belongs to the [WebService](/resources/compute/web-service) resource and is independent of the packaging mode — adjust these values based on your application's compute needs, not the buildpack choice.


Example (TypeScript):

```typescript
import { defineConfig, WebService, ExternalBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new ExternalBuildpackPackaging({
      sourceDirectoryPath: './spring-app',
      builder: 'heroku/builder:24',
      buildpacks: ['heroku/java'],
      command: ['java', '-jar', 'target/app.jar', '--server.port=80']
    }),
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return {
    resources: { api }
  };
});
```


## Using with batch jobs

External buildpack packaging works identically with [batch jobs](/resources/compute/batch-job). The packaging properties (`sourceDirectoryPath`, `builder`, `buildpacks`, `command`) are the same as for container services — see the [batch-job page](/resources/compute/batch-job) for the surrounding job configuration (resources, retries, timeouts).

## Choosing a container packaging mode

Stacktape supports five container packaging modes. Use external buildpack when you specifically need the Cloud Native Buildpack ecosystem — for most projects, the Stacktape image buildpack or a custom Dockerfile is a better starting point.

| Mode | Dockerfile needed | Auto-detects language | Best for |
|------|:-:|:-:|---------|
| [Stacktape buildpack](/packaging/containers/stacktape-buildpack) | No | No | JS/TS, Python, Java, Go — tightest Stacktape integration |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | Yes | No | Complex or multi-stage builds, full image control |
| [Prebuilt image](/packaging/containers/prebuilt-image) | No | No | Existing images in a registry |
| [Nixpacks](/packaging/containers/nixpacks) | No | Yes | Nix-based reproducibility, broad language matrix |
| **External buildpack** | No | Yes | CNB ecosystem, Heroku migration, broad language and framework coverage |

Use the Stacktape image buildpack if your language is supported and you want the most integrated path. Choose external buildpack when you need a specific builder ecosystem (Paketo, Heroku, Google), broader language support, or compatibility with an existing CNB workflow.

## API reference


### Definition: `ExternalBuildpackCwImagePackagingProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `ExternalBuildpackCwImagePackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `sourceDirectoryPath` | yes | `string` | - |
| `builder` | no | `string` | `paketobuildpacks/builder-jammy-base` |
| `buildpacks` | no | `Array<string>` | - |
| `command` | no | `Array<string>` | - |


## FAQ

### Can I use Heroku buildpacks with Stacktape?

Yes. Set `builder` to a Heroku builder image like `heroku/builder:24`. If you're migrating from Heroku, this lets you keep the same build process your team already understands. You can also specify individual Heroku buildpacks in the `buildpacks` array for more granular control.

### How does external buildpack differ from the Stacktape image buildpack?

The [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) is Stacktape's own packaging system that bundles your code and dependencies into an optimized container image. It supports JavaScript/TypeScript, Python, Java, and Go. External buildpack delegates image creation entirely to the Cloud Native Buildpack ecosystem — buildpacks exist for almost any language or framework. Use the Stacktape buildpack when your language is supported and you want the integrated path; use external buildpack when you need a specific CNB builder or broader language coverage.

### Why is my buildpack build failing?

Common causes include missing dependency files (no `package.json`, `requirements.txt`, `pom.xml`, etc. in the source directory), an incompatible builder version, or the builder not recognizing your language. Verify your `sourceDirectoryPath` points at the directory containing the files the builder expects, and check the builder's documentation for supported language versions. If auto-detection picks the wrong buildpack, pin it explicitly via the `buildpacks` array.

### When should I use a custom Dockerfile instead?

Use a [custom Dockerfile](/packaging/containers/custom-dockerfile) when you need multi-stage builds, a specific base image no builder provides, system-level packages beyond what buildpacks include, or full control over the image layer structure. Cloud Native Buildpacks are opinionated about image layout — if that opinion doesn't fit, a Dockerfile gives complete control.

### Is external buildpack more expensive than other packaging modes?

No — the packaging mode has no runtime cost difference. You pay for the same ECS Fargate or EC2 compute regardless of how the image was built. The only difference is build time: Cloud Native Buildpacks reuse cached dependency layers across deploys when dependencies haven't changed, so subsequent builds can be faster. If deploy speed matters, compare against the [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) for supported languages.
