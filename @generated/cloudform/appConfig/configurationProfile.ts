import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}

export class Validators {
  Type?: Value<string>;
  Content?: Value<string>;
  constructor(properties: Validators) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationProfileProperties {
  LocationUri: Value<string>;
  Type?: Value<string>;
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  Validators?: List<Validators>;
  RetrievalRoleArn?: Value<string>;
  DeletionProtectionCheck?: Value<string>;
  ApplicationId: Value<string>;
  Tags?: List<Tags>;
  Name: Value<string>;
}
export default class ConfigurationProfile extends ResourceBase<ConfigurationProfileProperties> {
  static Tags = Tags;
  static Validators = Validators;
  constructor(properties: ConfigurationProfileProperties) {
    super('AWS::AppConfig::ConfigurationProfile', properties);
  }
}
