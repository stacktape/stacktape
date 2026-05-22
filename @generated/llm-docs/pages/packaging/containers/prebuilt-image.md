# Prebuilt Image

Prebuilt image packaging references an existing container image from any registry — Docker Hub, Amazon ECR, GitHub Container Registry, or a private registry. Stacktape skips the build step entirely and deploys the image directly. Use this when your image is already built by an external CI/CD pipeline, or when you want to run a third-party image like Nginx, Redis, or Prometheus.

This packaging mode applies to [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), and [batch jobs](/resources/compute/batch-job).

## Container packaging modes

Stacktape supports five container packaging modes. Each mode targets a different workflow:

| Mode | When to use |
|------|------------|
| [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) | Zero-config build from source. Point to an entry file; Stacktape produces an optimized image. |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | You need full control over the build. Provide your own Dockerfile and build context. |
| **Prebuilt image** (this page) | The image already exists in a registry. Stacktape skips building entirely. |
| [Nixpacks](/packaging/containers/nixpacks) | Auto-detect language and build an image with Nixpacks. No Dockerfile needed. |
| [External buildpack](/packaging/containers/external-buildpack) | Use a Cloud Native Buildpack (e.g. Paketo) to build the image from source. |

Use prebuilt image if your image already exists. Use custom Dockerfile or Stacktape buildpack if you want Stacktape to build and push the image for you during deployment.

## When to use

Use prebuilt image packaging when:

- **Your CI/CD pipeline already builds images.** If GitHub Actions, GitLab CI, or another pipeline pushes tagged images to a registry, reference them directly instead of rebuilding inside Stacktape.
- **You're running third-party software.** Images like `nginx`, `redis`, `postgres`, or `grafana/grafana` are ready to use from Docker Hub or other public registries.
- **You share images across multiple services.** A single image built once can be referenced by several Stacktape resources without redundant builds.
- **You need full control over the build environment.** Build externally with any tooling (Bazel, Nix, Kaniko) and hand the final image to Stacktape.

## When NOT to use

Skip prebuilt image packaging when:

- **You want Stacktape to handle the entire build.** The [Stacktape image buildpack](/packaging/containers/stacktape-buildpack), [custom Dockerfile](/packaging/containers/custom-dockerfile), [Nixpacks](/packaging/containers/nixpacks), or [external buildpack](/packaging/containers/external-buildpack) modes build, tag, and push to ECR automatically.
- **You don't have an external image pipeline yet.** Setting up a separate registry and build system adds operational overhead. Let Stacktape build and push to its managed ECR repository instead.
- **You need Stacktape to detect code changes.** With prebuilt-image, the `image` property value is what Stacktape configures. If the tag doesn't change, Stacktape has no signal that image content changed. Build-based modes detect source changes automatically.

## Basic example

The smallest valid configuration references a public image by name and tag:


Example (TypeScript):

```typescript
import { defineConfig, WebService, PrebuiltImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const webService = new WebService({
    packaging: new PrebuiltImagePackaging({
      image: 'httpd:latest'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { webService }
  };
});
```


The `image` property accepts any valid container image reference: a Docker Hub short name (`httpd:latest`), a full registry URL (`123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:v1.2.3`), or a GitHub Container Registry path (`ghcr.io/my-org/my-app:main`).

## Private registry images

To pull from a private registry that requires authentication, store your credentials in AWS Secrets Manager and reference the secret ARN via `repositoryCredentialsSecretArn`. The secret must be a JSON object with `username` and `password` keys.

You can create the secret using the Stacktape CLI [`secret:create`](/cli/secret-create) command with the `--secretName` and `--secretValue` flags:

```bash
stacktape secret:create --secretName my-registry-creds --secretValue '{"username":"my-user","password":"my-token"}'
```

Then reference the secret ARN in your config:


Example (TypeScript):

```typescript
import { defineConfig, WebService, PrebuiltImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new PrebuiltImagePackaging({
      image: 'registry.example.com/my-org/my-app:v2.1.0',
      repositoryCredentialsSecretArn:
        'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-registry-creds-AbCdEf'
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


The `repositoryCredentialsSecretArn` property points Stacktape at an AWS Secrets Manager secret containing `username` and `password` credentials for the private registry. AWS ECS uses the configured repository credentials when pulling from the private registry.


> **Info:** For Amazon ECR, ECS authentication depends on the task execution role and ECR repository permissions. Use `repositoryCredentialsSecretArn` for registries that require explicit username/password credentials (Docker Hub, GitHub Container Registry, GitLab Registry, self-hosted registries).


## Overriding startup behavior

You can override the image's default startup instructions without rebuilding it. The `command` and `entryPoint` properties map directly to Docker's `CMD` and `ENTRYPOINT` concepts.

### Command override

The `command` property overrides the image's `CMD` instruction. Use this to pass different arguments or run an alternative script:


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, PrebuiltImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new PrebuiltImagePackaging({
      image: 'my-org/data-pipeline:v1.4.0',
      command: ['node', 'dist/worker.js', '--mode', 'batch']
    }),
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return {
    resources: { worker }
  };
});
```


The `command` property accepts a string array. Each element becomes a separate argument — this matches Docker's exec-form `CMD ["arg1", "arg2"]` behavior.

### Entrypoint override

The `entryPoint` property overrides the image's `ENTRYPOINT` instruction. This is useful when you need to wrap the default process with an init script or switch the executable entirely:


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, PrebuiltImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const internal = new PrivateService({
    packaging: new PrebuiltImagePackaging({
      image: 'my-org/api-server:v3.0.0',
      entryPoint: ['/app/entrypoint.sh'],
      command: ['--config', '/etc/app/config.yaml']
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { internal }
  };
});
```


When both `entryPoint` and `command` are specified, `entryPoint` sets the executable and `command` provides its arguments — matching Docker's `ENTRYPOINT` + `CMD` composition model.


> **Info:** The `entryPoint` and `repositoryCredentialsSecretArn` properties are available on web services, private services, worker services, and multi-container workloads. Batch jobs support only `image` and `command`.


## Multi-container workloads

When using prebuilt images in a [multi-container workload](/resources/compute/multi-container-workload), each container specifies its own packaging independently. This lets you combine prebuilt third-party images (like a sidecar proxy) with application containers built from source:


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  PrebuiltImagePackaging,
  StacktapeImageBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/server.ts'
        })
      },
      {
        name: 'envoy-proxy',
        packaging: new PrebuiltImagePackaging({
          image: 'envoyproxy/envoy:v1.28-latest',
          command: ['envoy', '-c', '/etc/envoy/envoy.yaml']
        })
      }
    ],
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return {
    resources: { app }
  };
});
```


This pattern is common for adding observability sidecars (Datadog agent, OpenTelemetry collector), reverse proxies (Envoy, Nginx), or log forwarders alongside your application container.

## Batch jobs

[Batch jobs](/resources/compute/batch-job) support prebuilt image packaging with a reduced property set. The batch-job prebuilt-image shape supports `image` and `command` — the `entryPoint` and `repositoryCredentialsSecretArn` properties are not available:


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, PrebuiltImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const etl = new BatchJob({
    packaging: new PrebuiltImagePackaging({
      image: 'my-org/etl-runner:v2.0.0',
      command: ['python', 'run_pipeline.py']
    }),
    resources: {
      cpu: 4,
      memory: 8192
    }
  });

  return {
    resources: { etl }
  };
});
```


For batch jobs that need private registry access, use a [custom Dockerfile](/packaging/containers/custom-dockerfile) mode instead, or push the image to Amazon ECR first.

## Image tagging strategy

The `image` property value is the image reference that Stacktape configures for the container resource. Prefer immutable tags for production so the config clearly identifies the image version being deployed.

| Strategy | Example | Tradeoff |
|----------|---------|----------|
| Immutable tags (recommended) | `my-app:v1.2.3` or `my-app:abc1234` | Every deploy is deterministic. You always know exactly which code is running. |
| `latest` tag | `my-app:latest` | Convenient for dev, but non-deterministic — the same tag can point to different image content. |
| Branch-based tags | `my-app:main` | Good for staging environments that track a branch. Still mutable. |


> **Tip:** Use immutable tags (semantic versions or commit SHAs) for production. Mutable tags like `latest` are non-deterministic — when ECS scales out or restarts tasks, it may pull a different image than what's running on existing tasks. Immutable tags eliminate this class of drift.


When you change the `image` value and redeploy, Stacktape updates the container resource's image reference. For details on how the underlying compute resource rolls out the change, see the relevant compute resource page ([web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), etc.).

## FAQ

### Which resources support prebuilt image packaging?

Prebuilt image packaging is supported by all container-based compute resources in Stacktape: [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), and [batch jobs](/resources/compute/batch-job). It is not available for [Lambda functions](/resources/compute/lambda-function), which use [function packaging modes](/packaging/function/stacktape-buildpack) instead.

### How does ECS pull images from a public registry?

AWS ECS Fargate can pull public images (Docker Hub, GitHub Container Registry, Quay) without credentials. No `repositoryCredentialsSecretArn` is needed for public repositories. For Docker Hub specifically, anonymous pulls are subject to Docker Hub's rate limits. If you encounter rate limiting, consider mirroring images to Amazon ECR or providing Docker Hub credentials via `repositoryCredentialsSecretArn`.

### When should I use prebuilt image vs custom Dockerfile?

Use prebuilt image when the image already exists — built by your CI pipeline, pulled from a public registry, or shared across services. Use [custom Dockerfile](/packaging/containers/custom-dockerfile) when you want Stacktape to build the image from source during deployment. Prebuilt image is faster to deploy (no build step) but requires external infrastructure to produce and push images.

### How do I update the deployed image version?

Change the `image` tag in your Stacktape config and redeploy. Stacktape uses the new image reference for the container resource. For immutable tags, the change is explicit in the config diff. For mutable tags like `latest`, you still need to trigger a redeployment even if the tag in your config hasn't changed, because the underlying image content may have been updated in the registry.

### Should I build images in CI or let Stacktape build them?

Let Stacktape build images (via [buildpack](/packaging/containers/stacktape-buildpack) or [custom Dockerfile](/packaging/containers/custom-dockerfile)) when you want the simplest setup — no registry management, no CI build steps for containers. Build in CI and use prebuilt image when you need custom tooling, want to share images across environments, run security scanning before deploy, or already have a container pipeline. Teams with mature CI systems often prefer prebuilt images for production and Stacktape buildpack for dev stages.

### What's the difference between command and entryPoint?

The `command` property overrides the image's Docker `CMD` instruction — typically the arguments passed to the main process. The `entryPoint` property overrides the Docker `ENTRYPOINT` instruction — the executable itself. When both are set, `entryPoint` is the executable and `command` provides its arguments. Most users only need `command` to pass different flags or scripts to the existing entrypoint.

### How do I debug startup failures with a prebuilt image?

Check container logs using [`stacktape debug:logs`](/cli/debug-logs) with the resource name. Common causes of startup failures: the image doesn't expose the expected port, the `command` override has a typo, required environment variables aren't set, or the process exits immediately instead of staying alive. Verify your `entryPoint` and `command` produce a long-running process for always-on resources (web services, private services, worker services).

### Does image size affect startup time?

Yes. Larger images take longer to pull and decompress before the container starts. For workloads where fast startup matters (scaling events, deployments), keep images lean — use multi-stage Docker builds, alpine-based images, or `.dockerignore` files to exclude unnecessary files before pushing to your registry.

### Can I use the same prebuilt image across multiple Stacktape resources?

Yes. Multiple resources can reference the same image tag. Each resource pulls independently. This is useful when a single base image serves different roles (API server, worker, migration runner) differentiated only by the `command` override. Build once, deploy many times with different startup arguments.

### How does prebuilt image compare to Nixpacks or external buildpack?

Prebuilt image skips the build entirely — you provide a ready-to-run image. [Nixpacks](/packaging/containers/nixpacks) and [external buildpack](/packaging/containers/external-buildpack) both auto-detect your language and build an image from source, similar to the [Stacktape image buildpack](/packaging/containers/stacktape-buildpack). Choose Nixpacks or external buildpack if you want automated builds without writing a Dockerfile. Choose prebuilt image if you want complete separation between building and deploying.

## API reference


## API Reference: `PrebuiltImageCwPackagingProps`
Configures a pre-built container image.

```typescript
type PrebuiltImageCwPackagingProps = {
  /** The name or URL of the container image. */
  image: string;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
  /** A script to be executed when the container starts. */
  entryPoint?: Array<string>;
  /** The ARN of a secret containing credentials for a private container registry. */
  repositoryCredentialsSecretArn?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `image` | yes | `string` | The name or URL of the container image. | - |
| `command` | no | `Array<string>` | A command to be executed when the container starts. This overrides the `CMD` instruction in the Dockerfile.

Example: `['/app/start.sh']` | - |
| `entryPoint` | no | `Array<string>` | A script to be executed when the container starts. This overrides the `ENTRYPOINT` instruction in the Dockerfile. | - |
| `repositoryCredentialsSecretArn` | no | `string` | The ARN of a secret containing credentials for a private container registry. The secret must be a JSON object with `username` and `password` keys.
You can create secrets using the `stacktape secret:create` command. | - |
