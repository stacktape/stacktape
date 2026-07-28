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
