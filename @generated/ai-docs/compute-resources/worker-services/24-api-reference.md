# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/worker-services.d.ts
/**
 * #### Worker Service
 *
 * ---
 *
 * A continuously running container that is inaccessible from the internet.
 * Ideal for background jobs and processing tasks.
 */
interface WorkerService {
  type: 'worker-service';
  properties: WorkerServiceProps;
  overrides?: ResourceOverrides;
}

interface WorkerServiceProps extends SimpleServiceContainer {}

type StpWorkerService = WorkerService['properties'] & {
  name: string;
  type: WorkerService['type'];
  configParentResourceType: WorkerService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
  };
};

type WorkerServiceReferencableParams = ContainerWorkloadReferencableParam;
```