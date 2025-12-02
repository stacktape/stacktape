import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationObject {
  DefaultValue?: Value<string>;
  AllowedValues?: List<Value<string>>;
  MinValue?: Value<string>;
  MaxValue?: Value<string>;
  constructor(properties: ConfigurationObject) {
    Object.assign(this, properties);
  }
}

export class ProfileConfiguration {
  JobConfiguration?: { [key: string]: ConfigurationObject };
  SessionConfiguration?: { [key: string]: ConfigurationObject };
  constructor(properties: ProfileConfiguration) {
    Object.assign(this, properties);
  }
}
export interface UsageProfileProperties {
  Description?: Value<string>;
  Configuration?: ProfileConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class UsageProfile extends ResourceBase<UsageProfileProperties> {
  static ConfigurationObject = ConfigurationObject;
  static ProfileConfiguration = ProfileConfiguration;
  constructor(properties: UsageProfileProperties) {
    super('AWS::Glue::UsageProfile', properties);
  }
}
