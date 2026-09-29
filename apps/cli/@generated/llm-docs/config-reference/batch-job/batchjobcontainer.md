# BatchJobContainer API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
import type { BuildpackBjImagePackaging, DockerfileBjImagePackaging, EnvironmentVar, JsBundleBjImagePackaging, PrebuiltBjImagePackaging, SecretEnvironmentVar } from 'stacktape';

type BatchJobContainer = {
  /** How to build or specify the container image for this job. */
  packaging: BatchJobContainerPackaging;
  /** Environment variables injected into the container at runtime. */
  environment?: Array<EnvironmentVar>;
  /** Sensitive environment variables fetched by AWS Batch instead of stored in the job definition.

Each `valueFrom` must be an exact `$SsmParam(...)` or `$Secret(...)` directive. */
  secrets?: Array<SecretEnvironmentVar>;
};

/** Union choices used by the properties above. */
type BatchJobContainerPackaging =
  | JsBundleBjImagePackaging
  | PrebuiltBjImagePackaging
  | DockerfileBjImagePackaging
  | BuildpackBjImagePackaging;
```

## Property: `packaging`

- Required: yes
- Type: `js-bundle | prebuilt-image | dockerfile | buildpack`

How to build or specify the container image for this job.

Choices:
- `js-bundle` (`JsBundleBjImagePackaging`) — Builds a container image from a bundled JavaScript or TypeScript entry file.. Properties: `requiresGlibcBinaries?: boolean`, `customDockerBuildCommands?: Array<string>`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`, `tsConfigPath?: string`, `emitTsDecoratorMetadata?: boolean`, `dependenciesToExcludeFromBundle?: Array<string>`, `dependenciesToExcludeFromDeploymentPackage?: Array<string>`, `outputModuleFormat?: string: "cjs" | "esm"`, `nodeVersion?: number: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24`, `disableSourceMaps?: boolean`, `outputSourceMapsTo?: string`, `minify?: boolean`, `minifyIdentifiers?: boolean`, `bundleAwsSdk?: boolean`.
- `prebuilt-image` (`PrebuiltBjImagePackaging`). Properties: `image: string`, `command?: Array<string>`.
- `dockerfile` (`DockerfileBjImagePackaging`). Properties: `dockerfilePath?: string`, `buildContextPath: string`, `buildArgs?: Array<DockerBuildArg>`, `command?: Array<string>`.
- `buildpack` (`BuildpackBjImagePackaging`) — Builds a container image from a project directory without a Dockerfile.. Properties: `sourceDirectoryPath?: string`, `startCommand?: string`, `buildCommand?: string`, `installCommand?: string`, `packages?: unknown`, `aptPackages?: Array<string>`, `buildEnvironment?: Array<EnvironmentVar>`, `railpackConfig?: unknown`.

### Example 1 (yaml)

```yaml
resources:
  dockerJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: dockerfile
          properties:
            buildContextPath: ./job
            dockerfilePath: Dockerfile
      resources:
        cpu: 2
        memory: 3840
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dockerJob = new BatchJob({
    container: {
      packaging: {
        type: 'dockerfile',
        properties: { buildContextPath: './job', dockerfilePath: 'Dockerfile' }
      }
    },
    resources: { cpu: 2, memory: 3840 }
  });
  return { resources: { dockerJob } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables injected into the container at runtime.

Use `$ResourceParam()` or `$Secret()` to inject database URLs, API keys, etc.

### Example 1 (yaml)

```yaml
resources:
  worker:
    type: batch-job
    properties:
      container:
        packaging:
          type: js-bundle
          properties:
            entryfilePath: src/worker.ts
        environment:
          - name: DATABASE_URL
            value: $ResourceParam('mainDb', 'connectionString')
          - name: API_KEY
            value: $Secret('externalApiKey')
      resources:
        cpu: 2
        memory: 3840
      connectTo:
        - mainDb
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
```

### Example 2 (typescript)

```typescript
import { BatchJob, RelationalDatabase, defineConfig, $ResourceParam, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('dbPassword') },
    engine: {
      type: 'postgres',
      properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } }
    }
  });
  const worker = new BatchJob({
    container: {
      packaging: {
        type: 'js-bundle',
        properties: { entryfilePath: 'src/worker.ts' }
      },
      environment: {
        DATABASE_URL: $ResourceParam('mainDb', 'connectionString'),
        API_KEY: $Secret('externalApiKey')
      }
    },
    resources: { cpu: 2, memory: 3840 },
    connectTo: [mainDb]
  });
  return { resources: { mainDb, worker } };
});
```

## Property: `secrets`

- Required: no
- Type: `Array<SecretEnvironmentVar>`

Sensitive environment variables fetched by AWS Batch instead of stored in the job definition.

Each `valueFrom` must be an exact `$SsmParam(...)` or `$Secret(...)` directive.
