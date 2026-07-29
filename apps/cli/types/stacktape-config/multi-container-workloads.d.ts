import type { Convex } from '@stacktape/config/convex';
import type {
  ContainerWorkloadHttpApiIntegration,
  ContainerWorkloadInternalIntegration,
  ContainerWorkloadLoadBalancerIntegration,
  ContainerWorkloadNetworkLoadBalancerIntegration,
  ContainerWorkloadServiceConnectIntegration
} from '@stacktape/config/events';
import type { ContainerWorkload, ContainerWorkloadScaling } from '@stacktape/config/multi-container-workloads';
import type { PrivateService } from '@stacktape/config/private-services';
import type { WebService } from '@stacktape/config/web-services';
import type { WorkerService } from '@stacktape/config/worker-services';

declare global {
type StpContainerWorkload = ContainerWorkload['properties'] & {
  /**
   * The instance range, which every producer of a container workload supplies.
   *
   * `ConfigManager` merges it from `RESOURCE_DEFAULTS` for an authored `multi-container-workload`; the web, private
   * and worker service families pass their own already-defaulted `scaling` down to the workload they synthesize; and
   * Convex hard-codes 1/1 for its backend and dashboard workloads.
   *
   * `scalingPolicy` deliberately stays optional. The defaults table does fill it, but the Convex producer does not,
   * so requiring it here would describe fewer workloads than actually reach this type.
   */
  scaling: ContainerWorkloadScaling & { minInstances: number; maxInstances: number };
  name: string;
  type: ContainerWorkload['type'];
  configParentResourceType:
    | WebService['type']
    | PrivateService['type']
    | WorkerService['type']
    | ContainerWorkload['type']
    | Convex['type'];
  nameChain: string[];
};
interface LoadBalancerAvailabilityCheck {
  httpPath?: string;
  intervalSeconds?: number;
}
interface ECSBlueGreenService {
  Type: 'Stacktape::ECSBlueGreenV1::Service';
  Properties: {
    ECSService: import('@cloudform/ecs/service').ServiceProperties;
    StackName: import('@cloudform/dataTypes').Value<string>;
    CodeDeployApplicationName: import('@cloudform/dataTypes').Value<string>;
    CodeDeployDeploymentGroupName: import('@cloudform/dataTypes').Value<string>;
    LifecycleEventHooks: {
      AfterAllowTraffic: import('@cloudform/dataTypes').Value<string>;
      BeforeAllowTraffic: import('@cloudform/dataTypes').Value<string>;
    };
  };
  DependsOn: string[];
}
type ContainerWorkloadReferencableParam = 'logGroupArn';
type ContainerWorkloadEvent =
  | ContainerWorkloadLoadBalancerIntegration
  | ContainerWorkloadHttpApiIntegration
  | ContainerWorkloadInternalIntegration
  | ContainerWorkloadServiceConnectIntegration
  | ContainerWorkloadNetworkLoadBalancerIntegration;
}
