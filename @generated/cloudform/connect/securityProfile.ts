import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Application {
  Type?: Value<string>;
  ApplicationPermissions!: List<Value<string>>;
  Namespace!: Value<string>;
  constructor(properties: Application) {
    Object.assign(this, properties);
  }
}

export class DataTableAccessControlConfiguration {
  PrimaryAttributeAccessControlConfiguration?: PrimaryAttributeAccessControlConfigurationItem;
  constructor(properties: DataTableAccessControlConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowModule {
  Type!: Value<string>;
  FlowModuleId!: Value<string>;
  constructor(properties: FlowModule) {
    Object.assign(this, properties);
  }
}

export class GranularAccessControlConfiguration {
  DataTableAccessControlConfiguration?: DataTableAccessControlConfiguration;
  constructor(properties: GranularAccessControlConfiguration) {
    Object.assign(this, properties);
  }
}

export class PrimaryAttributeAccessControlConfigurationItem {
  PrimaryAttributeValues!: List<PrimaryAttributeValue>;
  constructor(properties: PrimaryAttributeAccessControlConfigurationItem) {
    Object.assign(this, properties);
  }
}

export class PrimaryAttributeValue {
  Values!: List<Value<string>>;
  AttributeName!: Value<string>;
  AccessType!: Value<string>;
  constructor(properties: PrimaryAttributeValue) {
    Object.assign(this, properties);
  }
}
export interface SecurityProfileProperties {
  Description?: Value<string>;
  AllowedAccessControlTags?: List<ResourceTag>;
  Applications?: List<Application>;
  AllowedAccessControlHierarchyGroupId?: Value<string>;
  InstanceArn: Value<string>;
  GranularAccessControlConfiguration?: GranularAccessControlConfiguration;
  Permissions?: List<Value<string>>;
  SecurityProfileName: Value<string>;
  AllowedFlowModules?: List<FlowModule>;
  TagRestrictedResources?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  HierarchyRestrictedResources?: List<Value<string>>;
}
export default class SecurityProfile extends ResourceBase<SecurityProfileProperties> {
  static Application = Application;
  static DataTableAccessControlConfiguration = DataTableAccessControlConfiguration;
  static FlowModule = FlowModule;
  static GranularAccessControlConfiguration = GranularAccessControlConfiguration;
  static PrimaryAttributeAccessControlConfigurationItem = PrimaryAttributeAccessControlConfigurationItem;
  static PrimaryAttributeValue = PrimaryAttributeValue;
  constructor(properties: SecurityProfileProperties) {
    super('AWS::Connect::SecurityProfile', properties);
  }
}
