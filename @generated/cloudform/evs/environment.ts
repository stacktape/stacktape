import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Check {
  Type!: Value<string>;
  ImpairedSince?: Value<string>;
  Result!: Value<string>;
  constructor(properties: Check) {
    Object.assign(this, properties);
  }
}

export class ConnectivityInfo {
  PrivateRouteServerPeerings!: List<Value<string>>;
  constructor(properties: ConnectivityInfo) {
    Object.assign(this, properties);
  }
}

export class HostInfoForCreate {
  KeyName!: Value<string>;
  DedicatedHostId?: Value<string>;
  PlacementGroupId?: Value<string>;
  InstanceType!: Value<string>;
  HostName!: Value<string>;
  constructor(properties: HostInfoForCreate) {
    Object.assign(this, properties);
  }
}

export class InitialVlanInfo {
  Cidr!: Value<string>;
  constructor(properties: InitialVlanInfo) {
    Object.assign(this, properties);
  }
}

export class InitialVlans {
  VmkManagement!: InitialVlanInfo;
  VTep!: InitialVlanInfo;
  ExpansionVlan2!: InitialVlanInfo;
  VSan!: InitialVlanInfo;
  VMotion!: InitialVlanInfo;
  IsHcxPublic?: Value<boolean>;
  Hcx!: InitialVlanInfo;
  EdgeVTep!: InitialVlanInfo;
  HcxNetworkAclId?: Value<string>;
  ExpansionVlan1!: InitialVlanInfo;
  VmManagement!: InitialVlanInfo;
  NsxUpLink!: InitialVlanInfo;
  constructor(properties: InitialVlans) {
    Object.assign(this, properties);
  }
}

export class LicenseInfo {
  SolutionKey!: Value<string>;
  VsanKey!: Value<string>;
  constructor(properties: LicenseInfo) {
    Object.assign(this, properties);
  }
}

export class Secret {
  SecretArn?: Value<string>;
  constructor(properties: Secret) {
    Object.assign(this, properties);
  }
}

export class ServiceAccessSecurityGroups {
  SecurityGroups?: List<Value<string>>;
  constructor(properties: ServiceAccessSecurityGroups) {
    Object.assign(this, properties);
  }
}

export class VcfHostnames {
  Nsx!: Value<string>;
  VCenter!: Value<string>;
  NsxManager1!: Value<string>;
  NsxEdge1!: Value<string>;
  NsxManager3!: Value<string>;
  SddcManager!: Value<string>;
  NsxManager2!: Value<string>;
  NsxEdge2!: Value<string>;
  CloudBuilder!: Value<string>;
  constructor(properties: VcfHostnames) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  LicenseInfo: LicenseInfo;
  Hosts?: List<HostInfoForCreate>;
  SiteId: Value<string>;
  KmsKeyId?: Value<string>;
  EnvironmentName?: Value<string>;
  ConnectivityInfo: ConnectivityInfo;
  InitialVlans?: InitialVlans;
  ServiceAccessSecurityGroups?: ServiceAccessSecurityGroups;
  VpcId: Value<string>;
  TermsAccepted: Value<boolean>;
  VcfVersion: Value<string>;
  VcfHostnames: VcfHostnames;
  ServiceAccessSubnetId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static Check = Check;
  static ConnectivityInfo = ConnectivityInfo;
  static HostInfoForCreate = HostInfoForCreate;
  static InitialVlanInfo = InitialVlanInfo;
  static InitialVlans = InitialVlans;
  static LicenseInfo = LicenseInfo;
  static Secret = Secret;
  static ServiceAccessSecurityGroups = ServiceAccessSecurityGroups;
  static VcfHostnames = VcfHostnames;
  constructor(properties: EnvironmentProperties) {
    super('AWS::EVS::Environment', properties);
  }
}
