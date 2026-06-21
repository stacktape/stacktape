import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InstanceConnectEndpointDnsNames {
  FipsDnsName?: Value<string>;
  DnsName?: Value<string>;
  constructor(properties: InstanceConnectEndpointDnsNames) {
    Object.assign(this, properties);
  }
}

export class InstanceConnectEndpointPublicDnsNames {
  Dualstack?: InstanceConnectEndpointDnsNames;
  Ipv4?: InstanceConnectEndpointDnsNames;
  constructor(properties: InstanceConnectEndpointPublicDnsNames) {
    Object.assign(this, properties);
  }
}
export interface InstanceConnectEndpointProperties {
  PreserveClientIp?: Value<boolean>;
  SubnetId: Value<string>;
  ClientToken?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class InstanceConnectEndpoint extends ResourceBase<InstanceConnectEndpointProperties> {
  static InstanceConnectEndpointDnsNames = InstanceConnectEndpointDnsNames;
  static InstanceConnectEndpointPublicDnsNames = InstanceConnectEndpointPublicDnsNames;
  constructor(properties: InstanceConnectEndpointProperties) {
    super('AWS::EC2::InstanceConnectEndpoint', properties);
  }
}
