# ContainerWorkloadProps API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
import type { ContainerWorkloadContainer, ContainerWorkloadDeploymentConfig, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling, StpIamRoleStatement } from 'stacktape';

type ContainerWorkloadProps = {
  /** Containers in this workload. They share compute resources and scale together. */
  containers: Array<ContainerWorkloadContainer>;
  /** CPU, memory, and compute engine (Fargate or EC2). */
  resources: ContainerWorkloadResourcesConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration. */
  deployment?: ContainerWorkloadDeploymentConfig;
  /** Enable stacktape container:session for interactive shell access to running containers. */
  enableRemoteSessions?: boolean;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Auto-scaling: how many instances and when to add/remove them. */
  scaling?: ContainerWorkloadScaling;
  /** Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP. */
  usePrivateSubnetsWithNAT?: boolean;
};
```

## Property: `containers`

- Required: yes
- Type: `Array<ContainerWorkloadContainer>`

Containers in this workload. They share compute resources and scale together.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```

## Property: `resources`

- Required: yes
- Type: `ContainerWorkloadResourcesConfig`

CPU, memory, and compute engine (Fargate or EC2).

**Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.
**EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
      resources:
        cpu: 1
        memory: 2048
        architecture: arm64
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 1, memory: 2048, architecture: 'arm64' }
  });
  return { resources: { app } };
});
```

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

## Property: `deployment`

- Required: no
- Type: `ContainerWorkloadDeploymentConfig`

Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      deployment:
        strategy: Canary10Percent5Minutes
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: { strategy: 'Canary10Percent5Minutes' }
  });
  return { resources: { app, appLb } };
});
```

## Property: `enableRemoteSessions`

- Required: no
- Type: `boolean`

Enable `stacktape container:session` for interactive shell access to running containers.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      enableRemoteSessions: true
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    enableRemoteSessions: true
  });
  return { resources: { app } };
});
```

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

## Property: `scaling`

- Required: no
- Type: `ContainerWorkloadScaling`

Auto-scaling: how many instances and when to add/remove them.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 10
        scalingPolicy:
          keepAvgCpuUtilizationUnder: 70
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 10,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 70 }
    }
  });
  return { resources: { app } };
});
```

## Property: `usePrivateSubnetsWithNAT`

- Required: no
- Type: `boolean`
- Default: `false`

Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP.

Useful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: worker
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/worker.ts
      resources:
        cpu: 0.5
        memory: 1024
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'worker', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    usePrivateSubnetsWithNAT: true
  });
  return { resources: { app } };
});
```
