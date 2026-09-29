# BuildpackCwImagePackagingProps API Reference

Builds a container image from a project directory without a Dockerfile.

## TypeScript definition

```typescript
import type { EnvironmentVar } from 'stacktape';

type BuildpackCwImagePackagingProps = {
  /** Debian packages to install with `apt`, available both during the build and at runtime. */
  aptPackages?: Array<string>;
  /** The command that builds the application after dependencies are installed. Overrides the detected build command. */
  buildCommand?: string;
  /** Environment variables available to the install and build commands. */
  buildEnvironment?: Array<EnvironmentVar>;
  /** The command that installs dependencies. Overrides the detected install command. */
  installCommand?: string;
  /** Versions of language runtimes and tools to install, by [mise](https://mise.jdx.dev) tool name. */
  packages?: unknown;
  /** Advanced: a [railpack.json](https://railpack.com/config/file) configuration merged over the detected build. */
  railpackConfig?: unknown;
  /** The directory to build, relative to the Stacktape config file. Defaults to the config file's directory. */
  sourceDirectoryPath?: string;
  /** The command that starts the application. Overrides the detected start command. */
  startCommand?: string;
};
```

## Property: `aptPackages`

- Required: no
- Type: `Array<string>`

Debian packages to install with `apt`, available both during the build and at runtime.

Common libraries such as `libpq` for PostgreSQL clients are installed automatically when the dependency
that needs them is detected.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          aptPackages:
            - ffmpeg
            - libvips
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      aptPackages: ['ffmpeg', 'libvips']
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `buildCommand`

- Required: no
- Type: `string`

The command that builds the application after dependencies are installed. Overrides the detected build command.

For Node.js projects the default is the `build` script of `package.json` when one exists.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          buildCommand: npm run build:server
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      buildCommand: 'npm run build:server'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `buildEnvironment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables available to the install and build commands.

They are passed as Docker build secrets: their values never appear in the image or in the build log, and a
changed value rebuilds the image. Runtime variables come from the resource's `environment` instead.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          buildEnvironment:
            - name: VITE_API_URL
              value: https://api.example.com
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      buildEnvironment: [{ name: 'VITE_API_URL', value: 'https://api.example.com' }]
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `installCommand`

- Required: no
- Type: `string`

The command that installs dependencies. Overrides the detected install command.

The default is the package manager's locked install, for example `npm ci`, `pnpm install --frozen-lockfile`
or `uv sync --locked`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          installCommand: npm ci --include=optional
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      installCommand: 'npm ci --include=optional'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `packages`

- Required: no
- Type: `unknown`

Versions of language runtimes and tools to install, by [mise](https://mise.jdx.dev) tool name.

Use it when the project has no version file of its own. Keys are tool names such as `node`, `python`,
`go`, `rust`, `ruby`, `php`, `java` or `pnpm`; values are versions such as `22` or `3.12`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          packages:
            node: '22'
            pnpm: '10'
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      packages: {
        node: '22',
        pnpm: '10'
      }
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `railpackConfig`

- Required: no
- Type: `unknown`

Advanced: a [railpack.json](https://railpack.com/config/file) configuration merged over the detected build.

Use it for build steps, caches or deploy settings the properties above do not cover. It takes precedence
over a `railpack.json` file in the source directory.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          railpackConfig:
            steps:
              build:
                commands:
                  - ...
                  - npx prisma generate
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
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
  return { resources: { apiService } };
});
```

## Property: `sourceDirectoryPath`

- Required: no
- Type: `string`

The directory to build, relative to the Stacktape config file. Defaults to the config file's directory.

Files matched by the directory's `.dockerignore` are left out of the build.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```

## Property: `startCommand`

- Required: no
- Type: `string`

The command that starts the application. Overrides the detected start command.

Runs through `bash -c` in the image's `/app` directory. Web services must listen on `$PORT`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./api
          startCommand: gunicorn --bind 0.0.0.0:$PORT app:app
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { BuildpackImagePackaging, WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new BuildpackImagePackaging({
      sourceDirectoryPath: './api',
      startCommand: 'gunicorn --bind 0.0.0.0:$PORT app:app'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });
  return { resources: { apiService } };
});
```
