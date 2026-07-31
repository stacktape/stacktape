import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type {
  ContainerWorkloadReferencableParam,
  StpContainerWorkload
} from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { PrivateService } from '@stacktape/config/private-services';

export type StpPrivateService = PrivateService['properties'] & {
  name: string;
  type: PrivateService['type'];
  configParentResourceType: PrivateService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    loadBalancer?: StpApplicationLoadBalancer;
  };
};
export type PrivateServiceReferencableParams = ContainerWorkloadReferencableParam | 'address';
