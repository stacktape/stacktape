import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionConfiguration {
  SelfManaged?: SelfManagedMode;
  ServiceManaged?: ServiceManagedMode;
  constructor(properties: ConnectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SelfManagedMode {
  ResourceConfigurationId!: Value<string>;
  constructor(properties: SelfManagedMode) {
    Object.assign(this, properties);
  }
}

export class ServiceManagedMode {
  IpAddressType?: Value<string>;
  VpcId!: Value<string>;
  PortRanges?: List<Value<string>>;
  Ipv4AddressesPerEni?: Value<number>;
  HostAddress!: Value<string>;
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: ServiceManagedMode) {
    Object.assign(this, properties);
  }
}
export interface PrivateConnectionProperties {
  ConnectionConfiguration: ConnectionConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  Certificate?: Value<string>;
}
export default class PrivateConnection extends ResourceBase<PrivateConnectionProperties> {
  static ConnectionConfiguration = ConnectionConfiguration;
  static SelfManagedMode = SelfManagedMode;
  static ServiceManagedMode = ServiceManagedMode;
  constructor(properties: PrivateConnectionProperties) {
    super('AWS::DevOpsAgent::PrivateConnection', properties);
  }
}
