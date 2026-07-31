import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type {
  HttpApiGatewayReferencableParam,
  StpHttpApiGateway
} from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type {
  ContainerWorkloadReferencableParam,
  StpContainerWorkload
} from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpNetworkLoadBalancer } from '@domain-services/config-manager/resolved-types/network-load-balancer';
import type { WebService } from '@stacktape/config/web-services';

export type StpWebService = WebService['properties'] & {
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
export type WebServiceReferencableParam = HttpApiGatewayReferencableParam | ContainerWorkloadReferencableParam;
