import { ResourceBase } from '../resource';
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
export interface SecurityControlProperties {
  SecurityControlId?: Value<string>;
  LastUpdateReason?: Value<string>;
  Parameters: { [key: string]: ParameterConfiguration };
  SecurityControlArn?: Value<string>;
}
export default class SecurityControl extends ResourceBase<SecurityControlProperties> {
  static ParameterConfiguration = ParameterConfiguration;
  static ParameterValue = ParameterValue;
  constructor(properties: SecurityControlProperties) {
    super('AWS::SecurityHub::SecurityControl', properties);
  }
}
