# Buildpack for Containers

The `buildpack` packaging type (`BuildpackImagePackaging`) builds a container image from a project directory without a Dockerfile. Stacktape detects the language, framework, package manager, tool versions and start command from the project's own files, builds the image and uploads it to a managed ECR repository.

Detection and the build plan come from [Railpack](https://railpack.com), an open-source builder by Railway. Stacktape runs it for you; you do not install or configure it.

It applies to [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), [batch jobs](/resources/compute/batch-job) and [AgentCore runtimes](/resources/ai/agentcore-runtime).

## When to use

Use `buildpack` when:

- **The service is not a single JavaScript or TypeScript entry file.** Python, Go, Rust, Java, PHP, Ruby, .NET and Elixir services, and Node.js frameworks with their own build output such as Next.js, Nuxt, Remix or Astro.
- **The project follows its ecosystem's conventions.** A lockfile, a standard dependency file and a conventional start script are enough. You do not need to write or maintain a Dockerfile.

Use another packaging type when:

- **A Node.js service has one entry file.** [`js-bundle`](/packaging/containers/js-bundle) bundles it into a smaller Alpine image.
- **You need full control over the image.** Use [`dockerfile`](/packaging/containers/dockerfile) for a specific base image, GPU drivers, multi-stage builds or a custom entrypoint.
- **The image already exists.** Use [`prebuilt-image`](/packaging/containers/prebuilt-image).

## Basic example

All properties are optional. `sourceDirectoryPath` defaults to the directory of the Stacktape configuration file.


Example (TypeScript):

```typescript
import { defineConfig, WebService, BuildpackImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api'
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


Example (YAML):

```yaml
resources:
  api:
    type: web-service
    properties:
      # stp-focus
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
      # stp-end-focus
      resources:
        cpu: 0.5
        memory: 1024
```


A web service must listen on the port in the `PORT` environment variable. Most detected start commands already do. If yours does not, set `startCommand`, for example `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

## What is detected

Stacktape reads these files in `sourceDirectoryPath`:

- **Dependency files and lockfiles:** `package.json` (including `packageManager` and `engines`), `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `pyproject.toml`, `requirements.txt`, `Pipfile`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `mix.exs`, `*.csproj`, `deno.json` and `gleam.toml`.
- **Version files:** `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `mise.toml` and `rust-toolchain.toml`.
- **`Procfile`:** overrides the detected start command.
- **`railpack.json`:** applied on top of the detected build. The `railpackConfig` property in the Stacktape configuration takes precedence over this file.

Files matched by `.dockerignore` in the source directory are left out of the build.

## Supported languages

| Language | Package managers and build tools | Frameworks with detected build and start commands |
|---|---|---|
| Node.js | npm, pnpm, yarn, bun | Next.js, Astro, SvelteKit, Remix, Nuxt, TanStack, Nx, Angular. Vite and Create React App single-page apps are served by Caddy. |
| Python | pip, uv, poetry, pdm, pipenv | Django, FastAPI, Flask |
| PHP | Composer | Laravel, served by FrankenPHP |
| Ruby | Bundler | Rails |
| Go | Go modules | |
| Rust | Cargo | |
| Java | Maven, Gradle | |
| .NET | dotnet | |
| Elixir | Mix | Phoenix |
| Deno, Gleam | | |
| Other | | C/C++, static sites, shell scripts |

If a project uses a layout the detection does not recognize, set `startCommand` and, if needed, `buildCommand`.

## Properties

Every property overrides one part of the detected build. A project that follows its ecosystem's conventions needs none of them.

| Property | Purpose |
|---|---|
| `sourceDirectoryPath` | Directory to build, relative to the Stacktape configuration file. Default: `.` |
| `startCommand` | Command that starts the app. Runs through `bash -c` in `/app`. |
| `buildCommand` | Command that builds the app after dependencies are installed. |
| `installCommand` | Command that installs dependencies. The default is the package manager's locked install, such as `npm ci` or `uv sync --locked`. |
| `packages` | Tool versions installed by [mise](https://mise.jdx.dev), such as `{ node: '22', pnpm: '10' }`. Use it when the project has no version file. |
| `aptPackages` | Debian packages installed with `apt`, available during the build and at runtime. |
| `buildEnvironment` | Environment variables for the install and build commands, passed as Docker build secrets. |
| `railpackConfig` | A [railpack.json](https://railpack.com/config/file) configuration merged over the detected build. |

### Start, build and install commands


Example (TypeScript):

```typescript
import { defineConfig, WebService, BuildpackImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      installCommand: 'uv sync --locked --no-dev',
      buildCommand: 'python manage.py collectstatic --noinput',
      startCommand: 'gunicorn --bind 0.0.0.0:$PORT config.wsgi'
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


### Tool versions and system packages

`packages` sets tool versions by mise tool name, for example `node`, `python`, `go`, `rust`, `ruby`, `php`, `java` or `pnpm`. A version file in the project, such as `.nvmrc` or `.python-version`, does the same and also works outside Stacktape.

`aptPackages` installs Debian packages. Common libraries, such as `libpq` for PostgreSQL clients, are installed automatically when a dependency that needs them is detected.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, BuildpackImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const renderer = new WorkerService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './renderer',
      packages: { node: '22', pnpm: '10' },
      aptPackages: ['ffmpeg']
    }),
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return {
    resources: { renderer }
  };
});
```


### Build environment variables

`buildEnvironment` makes variables available to the install and build commands, for example a token for a private package registry or a public URL that a frontend build embeds. Values are passed as Docker build secrets. They never appear in the image or in the build log, and a changed value rebuilds the image.

Runtime variables come from the resource's `environment` property, not from `buildEnvironment`.


Example (TypeScript):

```typescript
import { defineConfig, WebService, BuildpackImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const web = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './web',
      buildEnvironment: [{ name: 'VITE_API_URL', value: 'https://api.example.com' }]
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { web }
  };
});
```


### Railpack configuration

`railpackConfig` accepts the same object as a [railpack.json](https://railpack.com/config/file) file. Use it for build steps, caches or deploy settings that the properties above do not cover. In a command list, `"..."` stands for the detected commands, so the example below runs `npx prisma generate` after the detected build.


Example (TypeScript):

```typescript
import { defineConfig, WebService, BuildpackImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      railpackConfig: {
        steps: { build: { commands: ['...', 'npx prisma generate'] } }
      }
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


## How the image is built

1. Stacktape runs `railpack prepare` locally. It reads the project files and produces a build plan: tool versions, install, build and start commands.
2. Docker BuildKit builds the plan with a pinned Railpack frontend image.
3. The image is pushed to a managed ECR repository.

The `railpack` binary is downloaded on first use, like other external tools Stacktape uses. It is pinned by version and checksum. The first planning run needs network access to resolve tool versions.

Docker must be running. Both `linux/amd64` and `linux/arm64` images are supported.

## Caching

If the source files, the build plan and the build variables have not changed, Stacktape reuses the previous image and skips the build.

When something has changed, BuildKit caches the dependency install layers, so a code-only change does not reinstall dependencies. The remote registry cache works the same way as for [`dockerfile`](/packaging/containers/dockerfile) builds.

## Image base and size

The runtime image is based on Debian (trixie) with the resolved tool versions installed by mise. Images are larger than the Alpine images of [`js-bundle`](/packaging/containers/js-bundle) and of Stacktape v3. A FastAPI app is about 150 MB.

## Framework and platform notes

### Django migrations

Railpack's default Django start command runs `manage.py migrate` before starting gunicorn. Stacktape removes the migrate step, because migrations belong in a [deployment hook](/deployment-and-lifecycle/deployment-scripts-and-hooks), not in every container start. To run migrations at start anyway, set `startCommand`, for example `python manage.py migrate && gunicorn --bind 0.0.0.0:$PORT config.wsgi`.

### Dev mode

In [dev mode](/local-development/dev-mode-overview) (`stacktape dev`), a `buildpack` service is rebuilt when its source changes. The dependency layer comes from the cache, so rebuilds after code changes are faster than the first build. There is no bind-mount reload as with `js-bundle`: every change produces a new image and restarts the container.

### Windows

Railpack does not support its Windows binary. On Windows, Stacktape runs the Railpack planner inside Docker instead.

## Full control with a Dockerfile

When detection and overrides are not enough, write a Dockerfile and use [`dockerfile`](/packaging/containers/dockerfile) packaging. You choose the base image, the build stages and the entrypoint.

## FAQ

### Do I need Railpack installed?

No. Stacktape downloads a pinned `railpack` binary on first use and verifies its checksum. You need Docker.

### Why does my web service fail its health check?

A common cause is an app that listens on a fixed port. Web services must listen on `$PORT`. Set `startCommand` so the server binds to `0.0.0.0:$PORT`.

### How do I pass a secret to the build?

Use `buildEnvironment`. Its values are Docker build secrets and do not end up in the image or the build log. For runtime secrets, use the resource's `secrets` or `environment` property. See [secrets](/configuration/secrets).

### Can I keep my `railpack.json`?

Yes. A `railpack.json` in `sourceDirectoryPath` is applied. If the Stacktape configuration also sets `railpackConfig`, the configuration takes precedence.

## API reference


### Definition: `BuildpackCwImagePackagingProps`

Builds a container image from a project directory without a Dockerfile.

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `BuildpackCwImagePackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `aptPackages` | no | `Array<string>` | - |
| `buildCommand` | no | `string` | - |
| `buildEnvironment` | no | `Array<EnvironmentVar>` | - |
| `installCommand` | no | `string` | - |
| `packages` | no | `unknown` | - |
| `railpackConfig` | no | `unknown` | - |
| `sourceDirectoryPath` | no | `string` | - |
| `startCommand` | no | `string` | - |
