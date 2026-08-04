# ContainerDependency API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerDependency = {
  /** The condition that the dependency container must meet. */
  condition: "COMPLETE" | "HEALTHY" | "START" | "SUCCESS";
  /** The name of the container that this container depends on. */
  containerName: string;
};
```

## Property: `condition`

- Required: yes
- Type: `string: "COMPLETE" | "HEALTHY" | "START" | "SUCCESS"`

The condition that the dependency container must meet.

Available conditions:

`START`: The dependency has started.
`COMPLETE`: The dependency has finished executing (regardless of success).
`SUCCESS`: The dependency has finished with an exit code of `0`.
`HEALTHY`: The dependency has passed its first health check.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: redis
          packaging:
            type: prebuilt-image
            properties:
              image: redis:7
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - redis-cli ping || exit 1
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          dependsOn:
            - containerName: redis
              condition: HEALTHY
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, PrebuiltImagePackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'redis',
        packaging: new PrebuiltImagePackaging({ image: 'redis:7' }),
        internalHealthCheck: { healthCheckCommand: ['CMD-SHELL', 'redis-cli ping || exit 1'] }
      },
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        dependsOn: [
          {
            containerName: 'redis',
            condition: 'HEALTHY'
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `containerName`

- Required: yes
- Type: `string`

The name of the container that this container depends on.
