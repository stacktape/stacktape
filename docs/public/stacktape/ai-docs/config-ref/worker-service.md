---
docType: config-ref
title: Worker Service
resourceType: worker-service
tags:
  - worker-service
  - background
  - worker
  - async-worker
source: types/stacktape-config/worker-services.d.ts
priority: 1
---

# Worker Service

Always-on container with no public URL. For background workers, queue processors, and internal tasks.

Runs 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources.

Resource type: `worker-service`

## TypeScript Definition

```typescript
/**
 * #### Always-on container with no public URL. For background workers, queue processors, and internal tasks.
 *
 * ---
 *
 * Runs 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources.
 */
interface WorkerService {
  type: 'worker-service';
  properties: WorkerServiceProps;
  overrides?: ResourceOverrides;
}

interface WorkerServiceProps extends SimpleServiceContainer {}

type WorkerServiceReferencableParams = ContainerWorkloadReferencableParam;
```
