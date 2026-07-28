import type { WebService } from '@stacktape/config/web-services';

declare global {
type StpWebService = WebService['properties'] & {
  name: string;
  type: WebService['type'];
  configParentResourceType: WebService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    httpApiGateway?: StpHttpApiGateway;
    loadBalancer?: StpApplicationLoadBalancer;
    networkLoadBalancer?: StpNetworkLoadBalancer;
  };
};
type WebServiceReferencableParam = HttpApiGatewayReferencableParam | ContainerWorkloadReferencableParam;
}
