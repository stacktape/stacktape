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
