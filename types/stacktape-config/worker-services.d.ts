/**
 * #### Always-on container with no public URL. For background workers, queue processors, and internal tasks.
 *
 * ---
 *
 * Runs 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources.
 */
interface WorkerService {
  /**
   * #### The type identifier for a worker service.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # Always-on worker that processes background jobs from a queue.
   * resources:
   *   # stp-focus
   *   jobProcessor:
   *     type: worker-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       connectTo:
   *         - jobsQueue
   *   # stp-end-focus
   *   jobsQueue:
   *     type: sqs-queue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, StacktapeImageBuildpackPackaging, WorkerService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jobsQueue = new SqsQueue({});
   *   // stp-focus
   *   const jobProcessor = new WorkerService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: './src/worker.ts'
   *     }),
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024
   *     },
   *     connectTo: [jobsQueue]
   *   });
   *   // stp-end-focus
   *
   *   return {
   *     resources: { jobProcessor, jobsQueue }
   *   };
   * });
   * ```
   */
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
