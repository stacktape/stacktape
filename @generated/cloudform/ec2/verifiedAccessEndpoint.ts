import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CidrOptions {
  Cidr?: Value<string>;
  PortRanges?: List<PortRange>;
  Protocol?: Value<string>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: CidrOptions) {
    Object.assign(this, properties);
  }
}

export class LoadBalancerOptions {
  LoadBalancerArn?: Value<string>;
  Port?: Value<number>;
  PortRanges?: List<PortRange>;
  Protocol?: Value<string>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: LoadBalancerOptions) {
    Object.assign(this, properties);
  }
}

export class NetworkInterfaceOptions {
  Port?: Value<number>;
  PortRanges?: List<PortRange>;
  NetworkInterfaceId?: Value<string>;
  Protocol?: Value<string>;
  constructor(properties: NetworkInterfaceOptions) {
    Object.assign(this, properties);
  }
}

export class PortRange {
  FromPort?: Value<number>;
  ToPort?: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}

export class RdsOptions {
  RdsDbProxyArn?: Value<string>;
  RdsDbClusterArn?: Value<string>;
  RdsEndpoint?: Value<string>;
  Port?: Value<number>;
  RdsDbInstanceArn?: Value<string>;
  Protocol?: Value<string>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: RdsOptions) {
    Object.assign(this, properties);
  }
}

export class SseSpecification {
  CustomerManagedKeyEnabled?: Value<boolean>;
  KmsKeyArn?: Value<string>;
  constructor(properties: SseSpecification) {
    Object.assign(this, properties);
  }
}
export interface VerifiedAccessEndpointProperties {
  AttachmentType: Value<string>;
  Description?: Value<string>;
  DomainCertificateArn?: Value<string>;
  VerifiedAccessGroupId: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  LoadBalancerOptions?: LoadBalancerOptions;
  ApplicationDomain?: Value<string>;
  PolicyEnabled?: Value<boolean>;
  CidrOptions?: CidrOptions;
  EndpointDomainPrefix?: Value<string>;
  EndpointType: Value<string>;
  PolicyDocument?: Value<string>;
  RdsOptions?: RdsOptions;
  SseSpecification?: SseSpecification;
  Tags?: List<ResourceTag>;
  NetworkInterfaceOptions?: NetworkInterfaceOptions;
}
export default class VerifiedAccessEndpoint extends ResourceBase<VerifiedAccessEndpointProperties> {
  static CidrOptions = CidrOptions;
  static LoadBalancerOptions = LoadBalancerOptions;
  static NetworkInterfaceOptions = NetworkInterfaceOptions;
  static PortRange = PortRange;
  static RdsOptions = RdsOptions;
  static SseSpecification = SseSpecification;
  constructor(properties: VerifiedAccessEndpointProperties) {
    super('AWS::EC2::VerifiedAccessEndpoint', properties);
  }
}
