import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessControlAttribute {
  Value!: AccessControlAttributeValue;
  Key!: Value<string>;
  constructor(properties: AccessControlAttribute) {
    Object.assign(this, properties);
  }
}

export class AccessControlAttributeValue {
  Source!: List<Value<string>>;
  constructor(properties: AccessControlAttributeValue) {
    Object.assign(this, properties);
  }
}
export interface InstanceAccessControlAttributeConfigurationProperties {
  InstanceArn: Value<string>;
  AccessControlAttributes?: List<AccessControlAttribute>;
}
export default class InstanceAccessControlAttributeConfiguration extends ResourceBase<InstanceAccessControlAttributeConfigurationProperties> {
  static AccessControlAttribute = AccessControlAttribute;
  static AccessControlAttributeValue = AccessControlAttributeValue;
  constructor(properties: InstanceAccessControlAttributeConfigurationProperties) {
    super('AWS::SSO::InstanceAccessControlAttributeConfiguration', properties);
  }
}
