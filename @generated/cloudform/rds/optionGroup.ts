import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class OptionConfiguration {
  OptionVersion?: Value<string>;
  VpcSecurityGroupMemberships?: List<Value<string>>;
  OptionSettings?: List<OptionSetting>;
  Port?: Value<number>;
  OptionName!: Value<string>;
  DBSecurityGroupMemberships?: List<Value<string>>;
  constructor(properties: OptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class OptionSetting {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: OptionSetting) {
    Object.assign(this, properties);
  }
}
export interface OptionGroupProperties {
  OptionGroupDescription: Value<string>;
  OptionGroupName?: Value<string>;
  OptionConfigurations?: List<OptionConfiguration>;
  MajorEngineVersion: Value<string>;
  EngineName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OptionGroup extends ResourceBase<OptionGroupProperties> {
  static OptionConfiguration = OptionConfiguration;
  static OptionSetting = OptionSetting;
  constructor(properties: OptionGroupProperties) {
    super('AWS::RDS::OptionGroup', properties);
  }
}
