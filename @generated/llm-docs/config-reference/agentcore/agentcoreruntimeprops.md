# AgentCoreRuntimeProps API Reference

## TypeScript definition

```typescript
import type { AgentCoreJwtAuthorizerConfig, AgentCoreRuntimeEndpointConfig, AgentCoreRuntimeLifecycleConfig, CloudformationTag, CustomDockerfileCwImagePackaging, EnvironmentVar, ExternalBuildpackCwImagePackaging, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, StpBuildpackCwImagePackaging, StpIamRoleStatement } from 'stacktape';

type AgentCoreRuntimeProps = {
  packaging: AgentCoreRuntimePackaging;
  authorizer?: AgentCoreJwtAuthorizerConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  description?: string;
  endpoints?: Array<AgentCoreRuntimeEndpoints>;
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  lifecycle?: AgentCoreRuntimeLifecycleConfig;
  protocol?: "A2A" | "AGUI" | "HTTP" | "MCP";
  requestHeaders?: Array<string>;
  tags?: Array<CloudformationTag>;
  useBrowser?: string;
  useCodeInterpreter?: string;
  useGateway?: string;
  useMemory?: string;
};

/** Union choices used by the properties above. */
type AgentCoreRuntimePackaging =
  | StpBuildpackCwImagePackaging
  | ExternalBuildpackCwImagePackaging
  | PrebuiltCwImagePackaging
  | CustomDockerfileCwImagePackaging
  | NixpacksCwImagePackaging;

type AgentCoreRuntimeEndpoints =
  | AgentCoreRuntimeEndpointConfig
  | "option-2";
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-image-buildpack | external-buildpack | prebuilt-image | custom-dockerfile | nixpacks`

Choices:
- `stacktape-image-buildpack` (`StpBuildpackCwImagePackaging`) — A zero-config buildpack that creates a container image from your source code.. Properties: `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`, `requiresGlibcBinaries?: boolean`, `customDockerBuildCommands?: Array<string>`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`.
- `external-buildpack` (`ExternalBuildpackCwImagePackaging`) — Builds a container image using an external buildpack.. Properties: `builder?: string`, `buildpacks?: Array<string>`, `sourceDirectoryPath: string`, `command?: Array<string>`.
- `prebuilt-image` (`PrebuiltCwImagePackaging`) — Uses a pre-built container image.. Properties: `repositoryCredentialsSecretArn?: string`, `entryPoint?: Array<string>`, `image: string`, `command?: Array<string>`.
- `custom-dockerfile` (`CustomDockerfileCwImagePackaging`) — Builds a container image from your own Dockerfile.. Properties: `entryPoint?: Array<string>`, `dockerfilePath?: string`, `buildContextPath: string`, `buildArgs?: Array<DockerBuildArg>`, `command?: Array<string>`.
- `nixpacks` (`NixpacksCwImagePackaging`) — Builds a container image using Nixpacks.. Properties: `sourceDirectoryPath: string`, `buildImage?: string`, `providers?: Array<string>`, `startCmd?: string`, `startRunImage?: string`, `startOnlyIncludeFiles?: Array<string>`, `phases?: Array<NixpacksPhase>`.

## Property: `authorizer`

- Required: no
- Type: `AgentCoreJwtAuthorizerConfig`

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Give this resource access to other resources in your stack.

List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - mainDb
        - uploads
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
  uploads:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, RelationalDatabase, Bucket, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const uploads = new Bucket({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [mainDb, uploads]
  });

  return { resources: { api, mainDb, uploads } };
});
```

## Property: `description`

- Required: no
- Type: `string`

## Property: `endpoints`

- Required: no
- Type: `Array<AgentCoreRuntimeEndpoint | option-2>`

Choices:
- `AgentCoreRuntimeEndpoint` (`AgentCoreRuntimeEndpointConfig`). Properties: `name: string`, `description?: string`, `runtimeVersion?: string`.
- `option-2`

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

## Property: `iamRoleStatements`

- Required: no
- Type: `Array<StpIamRoleStatement>`

Raw IAM policy statements for permissions not covered by `connectTo`.

Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).

### Example 1 (yaml)

```yaml
resources:
  processor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 1
        memory: 2048
      iamRoleStatements:
        - Effect: Allow
          Action:
            - textract:AnalyzeDocument
          Resource:
            - '*'
```

### Example 2 (typescript)

```typescript
import { BatchJob, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const processor = new BatchJob({
    container: { packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/job.ts' }) },
    resources: { cpu: 1, memory: 2048 },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['textract:AnalyzeDocument'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { processor } };
});
```

## Property: `lifecycle`

- Required: no
- Type: `AgentCoreRuntimeLifecycleConfig`

## Property: `protocol`

- Required: no
- Type: `string: "A2A" | "AGUI" | "HTTP" | "MCP"`

## Property: `requestHeaders`

- Required: no
- Type: `Array<string>`

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`

## Property: `useBrowser`

- Required: no
- Type: `string`

## Property: `useCodeInterpreter`

- Required: no
- Type: `string`

## Property: `useGateway`

- Required: no
- Type: `string`

## Property: `useMemory`

- Required: no
- Type: `string`
