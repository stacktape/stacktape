import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigParameter {
  ParameterValue?: Value<string>;
  ParameterKey?: Value<string>;
  constructor(properties: ConfigParameter) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  Address?: Value<string>;
  VpcEndpoints?: List<VpcEndpoint>;
  Port?: Value<number>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}

export class NetworkInterface {
  PrivateIpAddress?: Value<string>;
  AvailabilityZone?: Value<string>;
  SubnetId?: Value<string>;
  NetworkInterfaceId?: Value<string>;
  constructor(properties: NetworkInterface) {
    Object.assign(this, properties);
  }
}

export class PerformanceTarget {
  Status?: Value<string>;
  Level?: Value<number>;
  constructor(properties: PerformanceTarget) {
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

export class WorkgroupInner {
  Status?: Value<string>;
  CreationDate?: Value<string>;
  WorkgroupName?: Value<string>;
  WorkgroupArn?: Value<string>;
  BaseCapacity?: Value<number>;
  EnhancedVpcRouting?: Value<boolean>;
  WorkgroupId?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  NamespaceName?: Value<string>;
  Endpoint?: Endpoint;
  ConfigParameters?: List<ConfigParameter>;
  TrackName?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  PricePerformanceTarget?: PerformanceTarget;
  MaxCapacity?: Value<number>;
  constructor(properties: WorkgroupInner) {
    Object.assign(this, properties);
  }
}
export interface WorkgroupProperties {
  SnapshotArn?: Value<string>;
  SnapshotOwnerAccount?: Value<string>;
  Port?: Value<number>;
  RecoveryPointId?: Value<string>;
  WorkgroupName: Value<string>;
  BaseCapacity?: Value<number>;
  EnhancedVpcRouting?: Value<boolean>;
  Workgroup?: Workgroup;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  SnapshotName?: Value<string>;
  NamespaceName?: Value<string>;
  ConfigParameters?: List<ConfigParameter>;
  TrackName?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  PricePerformanceTarget?: PerformanceTarget;
  Tags?: List<ResourceTag>;
  MaxCapacity?: Value<number>;
}
export default class Workgroup extends ResourceBase<WorkgroupProperties> {
  static ConfigParameter = ConfigParameter;
  static Endpoint = Endpoint;
  static NetworkInterface = NetworkInterface;
  static PerformanceTarget = PerformanceTarget;
  static VpcEndpoint = VpcEndpoint;
  static Workgroup = WorkgroupInner;
  constructor(properties: WorkgroupProperties) {
    super('AWS::RedshiftServerless::Workgroup', properties);
  }
}
