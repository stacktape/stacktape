import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PartnerAppConfig {
  AdminUsers?: List<Value<string>>;
  Arguments?: { [key: string]: Value<string> };
  constructor(properties: PartnerAppConfig) {
    Object.assign(this, properties);
  }
}

export class PartnerAppMaintenanceConfig {
  MaintenanceWindowStart!: Value<string>;
  constructor(properties: PartnerAppMaintenanceConfig) {
    Object.assign(this, properties);
  }
}
export interface PartnerAppProperties {
  ExecutionRoleArn: Value<string>;
  Type: Value<string>;
  KmsKeyId?: Value<string>;
  EnableIamSessionBasedIdentity?: Value<boolean>;
  Tier: Value<string>;
  ApplicationConfig?: PartnerAppConfig;
  AuthType: Value<string>;
  MaintenanceConfig?: PartnerAppMaintenanceConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class PartnerApp extends ResourceBase<PartnerAppProperties> {
  static PartnerAppConfig = PartnerAppConfig;
  static PartnerAppMaintenanceConfig = PartnerAppMaintenanceConfig;
  constructor(properties: PartnerAppProperties) {
    super('AWS::SageMaker::PartnerApp', properties);
  }
}
