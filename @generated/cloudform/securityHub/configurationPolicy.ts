import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ParameterConfiguration {
  ValueType!: Value<string>;
  Value?: ParameterValue;
  constructor(properties: ParameterConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParameterValue {
  Enum?: Value<string>;
  Integer?: Value<number>;
  StringList?: List<Value<string>>;
  EnumList?: List<Value<string>>;
  IntegerList?: List<Value<number>>;
  String?: Value<string>;
  Boolean?: Value<boolean>;
  Double?: Value<number>;
  constructor(properties: ParameterValue) {
    Object.assign(this, properties);
  }
}

export class Policy {
  SecurityHub?: SecurityHubPolicy;
  constructor(properties: Policy) {
    Object.assign(this, properties);
  }
}

export class SecurityControlCustomParameter {
  SecurityControlId?: Value<string>;
  Parameters?: { [key: string]: ParameterConfiguration };
  constructor(properties: SecurityControlCustomParameter) {
    Object.assign(this, properties);
  }
}

export class SecurityControlsConfiguration {
  DisabledSecurityControlIdentifiers?: List<Value<string>>;
  EnabledSecurityControlIdentifiers?: List<Value<string>>;
  SecurityControlCustomParameters?: List<SecurityControlCustomParameter>;
  constructor(properties: SecurityControlsConfiguration) {
    Object.assign(this, properties);
  }
}

export class SecurityHubPolicy {
  EnabledStandardIdentifiers?: List<Value<string>>;
  ServiceEnabled?: Value<boolean>;
  SecurityControlsConfiguration?: SecurityControlsConfiguration;
  constructor(properties: SecurityHubPolicy) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationPolicyProperties {
  Description?: Value<string>;
  ConfigurationPolicy: Policy;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class ConfigurationPolicy extends ResourceBase<ConfigurationPolicyProperties> {
  static ParameterConfiguration = ParameterConfiguration;
  static ParameterValue = ParameterValue;
  static Policy = Policy;
  static SecurityControlCustomParameter = SecurityControlCustomParameter;
  static SecurityControlsConfiguration = SecurityControlsConfiguration;
  static SecurityHubPolicy = SecurityHubPolicy;
  constructor(properties: ConfigurationPolicyProperties) {
    super('AWS::SecurityHub::ConfigurationPolicy', properties);
  }
}
