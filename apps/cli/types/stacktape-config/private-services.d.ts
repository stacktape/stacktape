import type { PrivateService } from '@stacktape/config/private-services';

declare global {
type StpPrivateService = PrivateService['properties'] & {
  name: string;
  type: PrivateService['type'];
  configParentResourceType: PrivateService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    loadBalancer?: StpApplicationLoadBalancer;
  };
};
type PrivateServiceReferencableParams = ContainerWorkloadReferencableParam | 'address';
}
