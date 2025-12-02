import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NetworkInterface {
  PrivateIpAddress?: Value<string>;
  AvailabilityZone?: Value<string>;
  SubnetId?: Value<string>;
  NetworkInterfaceId?: Value<string>;
  constructor(properties: NetworkInterface) {
    Object.assign(this, properties);
  }
}

export class VpcEndpoint {
  VpcId?: Value<string>;
  NetworkInterfaces?: List<NetworkInterface>;
  VpcEndpointId?: Value<string>;
  constructor(properties: VpcEndpoint) {
    Object.assign(this, properties);
  }
}

export class VpcSecurityGroup {
  Status?: Value<string>;
  VpcSecurityGroupId?: Value<string>;
  constructor(properties: VpcSecurityGroup) {
    Object.assign(this, properties);
  }
}
export interface EndpointAccessProperties {
  EndpointName: Value<string>;
  VpcSecurityGroupIds: List<Value<string>>;
  ResourceOwner?: Value<string>;
  SubnetGroupName: Value<string>;
  ClusterIdentifier: Value<string>;
}
export default class EndpointAccess extends ResourceBase<EndpointAccessProperties> {
  static NetworkInterface = NetworkInterface;
  static VpcEndpoint = VpcEndpoint;
  static VpcSecurityGroup = VpcSecurityGroup;
  constructor(properties: EndpointAccessProperties) {
    super('AWS::Redshift::EndpointAccess', properties);
  }
}
