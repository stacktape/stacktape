import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCEndpointServiceProperties {
  NetworkLoadBalancerArns?: List<Value<string>>;
  PayerResponsibility?: Value<string>;
  AcceptanceRequired?: Value<boolean>;
  ContributorInsightsEnabled?: Value<boolean>;
  SupportedIpAddressTypes?: List<Value<string>>;
  GatewayLoadBalancerArns?: List<Value<string>>;
  SupportedRegions?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class VPCEndpointService extends ResourceBase<VPCEndpointServiceProperties> {
  constructor(properties?: VPCEndpointServiceProperties) {
    super('AWS::EC2::VPCEndpointService', properties || {});
  }
}
