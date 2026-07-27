import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ArgoCd {
  ServerUrl?: Value<string>;
  NetworkAccess?: NetworkAccess;
  AwsIdc!: AwsIdc;
  RbacRoleMappings?: List<ArgoCdRoleMapping>;
  Namespace?: Value<string>;
  constructor(properties: ArgoCd) {
    Object.assign(this, properties);
  }
}

export class ArgoCdRoleMapping {
  Role!: Value<string>;
  Identities!: List<SsoIdentity>;
  constructor(properties: ArgoCdRoleMapping) {
    Object.assign(this, properties);
  }
}

export class AwsIdc {
  IdcRegion?: Value<string>;
  IdcManagedApplicationArn?: Value<string>;
  IdcInstanceArn!: Value<string>;
  constructor(properties: AwsIdc) {
    Object.assign(this, properties);
  }
}

export class CapabilityConfiguration {
  ArgoCd?: ArgoCd;
  constructor(properties: CapabilityConfiguration) {
    Object.assign(this, properties);
  }
}

export class NetworkAccess {
  VpceIds?: List<Value<string>>;
  constructor(properties: NetworkAccess) {
    Object.assign(this, properties);
  }
}

export class SsoIdentity {
  Type!: Value<string>;
  Id!: Value<string>;
  constructor(properties: SsoIdentity) {
    Object.assign(this, properties);
  }
}
export interface CapabilityProperties {
  Type: Value<string>;
  Configuration?: CapabilityConfiguration;
  ClusterName: Value<string>;
  DeletePropagationPolicy: Value<string>;
  CapabilityName: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Capability extends ResourceBase<CapabilityProperties> {
  static ArgoCd = ArgoCd;
  static ArgoCdRoleMapping = ArgoCdRoleMapping;
  static AwsIdc = AwsIdc;
  static CapabilityConfiguration = CapabilityConfiguration;
  static NetworkAccess = NetworkAccess;
  static SsoIdentity = SsoIdentity;
  constructor(properties: CapabilityProperties) {
    super('AWS::EKS::Capability', properties);
  }
}
