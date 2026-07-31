import type {
  ContainerWorkloadReferencableParam,
  StpContainerWorkload
} from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { WorkerService } from '@stacktape/config/worker-services';

export type StpWorkerService = WorkerService['properties'] & {
  name: string;
  type: WorkerService['type'];
  configParentResourceType: WorkerService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
  };
};
export type WorkerServiceReferencableParams = ContainerWorkloadReferencableParam;
