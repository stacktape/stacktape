# BatchJobContainer API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
import type { CustomDockerfileBjImagePackaging, EnvironmentVar, ExternalBuildpackBjImagePackaging, NixpacksBjImagePackaging, PrebuiltBjImagePackaging, StpBuildpackBjImagePackaging } from 'stacktape';

type BatchJobContainer = {
  /** How to build or specify the container image for this job. */
  packaging: BatchJobContainerPackaging;
  /** Environment variables injected into the container at runtime. */
  environment?: Array<EnvironmentVar>;
};

/** Union choices used by the properties above. */
type BatchJobContainerPackaging =
  | StpBuildpackBjImagePackaging
  | ExternalBuildpackBjImagePackaging
  | PrebuiltBjImagePackaging
  | CustomDockerfileBjImagePackaging
  | NixpacksBjImagePackaging;
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-image-buildpack | external-buildpack | prebuilt-image | custom-dockerfile | nixpacks`

How to build or specify the container image for this job.

Choices:
- `stacktape-image-buildpack` (`StpBuildpackBjImagePackaging`). Properties: `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`, `requiresGlibcBinaries?: boolean`, `customDockerBuildCommands?: Array<string>`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`.
- `external-buildpack` (`ExternalBuildpackBjImagePackaging`). Properties: `builder?: string`, `buildpacks?: Array<string>`, `sourceDirectoryPath: string`, `command?: Array<string>`.
- `prebuilt-image` (`PrebuiltBjImagePackaging`). Properties: `image: string`, `command?: Array<string>`.
- `custom-dockerfile` (`CustomDockerfileBjImagePackaging`). Properties: `dockerfilePath?: string`, `buildContextPath: string`, `buildArgs?: Array<DockerBuildArg>`, `command?: Array<string>`.
- `nixpacks` (`NixpacksBjImagePackaging`). Properties: `sourceDirectoryPath: string`, `buildImage?: string`, `providers?: Array<string>`, `startCmd?: string`, `startRunImage?: string`, `startOnlyIncludeFiles?: Array<string>`, `phases?: Array<NixpacksPhase>`.

### Example 1 (yaml)

```yaml
resources:
  dockerJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: custom-dockerfile
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
        type: 'custom-dockerfile',
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
          type: stacktape-image-buildpack
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
        type: 'stacktape-image-buildpack',
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
