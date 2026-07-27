import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AssertionAttributes {
  Role?: Value<string>;
  Email?: Value<string>;
  Org?: Value<string>;
  Groups?: Value<string>;
  Login?: Value<string>;
  Name?: Value<string>;
  constructor(properties: AssertionAttributes) {
    Object.assign(this, properties);
  }
}

export class IdpMetadata {
  Xml?: Value<string>;
  Url?: Value<string>;
  constructor(properties: IdpMetadata) {
    Object.assign(this, properties);
  }
}

export class NetworkAccessControl {
  PrefixListIds?: List<Value<string>>;
  VpceIds?: List<Value<string>>;
  constructor(properties: NetworkAccessControl) {
    Object.assign(this, properties);
  }
}

export class RoleValues {
  Editor?: List<Value<string>>;
  Admin?: List<Value<string>>;
  constructor(properties: RoleValues) {
    Object.assign(this, properties);
  }
}

export class SamlConfiguration {
  LoginValidityDuration?: Value<number>;
  RoleValues?: RoleValues;
  IdpMetadata!: IdpMetadata;
  AssertionAttributes?: AssertionAttributes;
  AllowedOrganizations?: List<Value<string>>;
  constructor(properties: SamlConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  SecurityGroupIds!: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface WorkspaceProperties {
  NotificationDestinations?: List<Value<string>>;
  PluginAdminEnabled?: Value<boolean>;
  Description?: Value<string>;
  PermissionType: Value<string>;
  AccountAccessType: Value<string>;
  StackSetName?: Value<string>;
  SamlConfiguration?: SamlConfiguration;
  OrganizationalUnits?: List<Value<string>>;
  RoleArn?: Value<string>;
  Name?: Value<string>;
  GrafanaVersion?: Value<string>;
  DataSources?: List<Value<string>>;
  AuthenticationProviders: List<Value<string>>;
  OrganizationRoleName?: Value<string>;
  VpcConfiguration?: VpcConfiguration;
  NetworkAccessControl?: NetworkAccessControl;
  ClientToken?: Value<string>;
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  static AssertionAttributes = AssertionAttributes;
  static IdpMetadata = IdpMetadata;
  static NetworkAccessControl = NetworkAccessControl;
  static RoleValues = RoleValues;
  static SamlConfiguration = SamlConfiguration;
  static VpcConfiguration = VpcConfiguration;
  constructor(properties: WorkspaceProperties) {
    super('AWS::Grafana::Workspace', properties);
  }
}
