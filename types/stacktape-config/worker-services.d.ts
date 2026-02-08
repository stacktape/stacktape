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
