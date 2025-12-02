import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoScalingGroupsConfiguration {
  AutoScalingGroupNameList!: List<Value<string>>;
  RoleArn!: Value<string>;
  constructor(properties: AutoScalingGroupsConfiguration) {
    Object.assign(this, properties);
  }
}

export class EksEndpointsConfiguration {
  ClusterApiServerCaCertificateChain!: Value<string>;
  EndpointsResourceName!: Value<string>;
  ClusterApiServerEndpointUri!: Value<string>;
  ClusterName!: Value<string>;
  EndpointsResourceNamespace!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: EksEndpointsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedEndpointConfiguration {
  EksEndpointsConfiguration?: EksEndpointsConfiguration;
  AutoScalingGroupsConfiguration?: AutoScalingGroupsConfiguration;
  constructor(properties: ManagedEndpointConfiguration) {
    Object.assign(this, properties);
  }
}

export class TrustStoreConfiguration {
  CertificateAuthorityCertificates!: List<Value<string>>;
  constructor(properties: TrustStoreConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ResponderGatewayProperties {
  TrustStoreConfiguration?: TrustStoreConfiguration;
  Description?: Value<string>;
  VpcId: Value<string>;
  DomainName?: Value<string>;
  Port: Value<number>;
  ManagedEndpointConfiguration?: ManagedEndpointConfiguration;
  Protocol: Value<string>;
  SubnetIds: List<Value<string>>;
  SecurityGroupIds: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class ResponderGateway extends ResourceBase<ResponderGatewayProperties> {
  static AutoScalingGroupsConfiguration = AutoScalingGroupsConfiguration;
  static EksEndpointsConfiguration = EksEndpointsConfiguration;
  static ManagedEndpointConfiguration = ManagedEndpointConfiguration;
  static TrustStoreConfiguration = TrustStoreConfiguration;
  constructor(properties: ResponderGatewayProperties) {
    super('AWS::RTBFabric::ResponderGateway', properties);
  }
}
