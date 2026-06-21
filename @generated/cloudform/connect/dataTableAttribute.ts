import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Enum {
  Strict?: Value<boolean>;
  Values?: List<Value<string>>;
  constructor(properties: Enum) {
    Object.assign(this, properties);
  }
}

export class LockVersion {
  DataTable?: Value<string>;
  Attribute?: Value<string>;
  constructor(properties: LockVersion) {
    Object.assign(this, properties);
  }
}

export class Validation {
  ExclusiveMinimum?: Value<number>;
  Enum?: Enum;
  Minimum?: Value<number>;
  Maximum?: Value<number>;
  ExclusiveMaximum?: Value<number>;
  MinLength?: Value<number>;
  MaxValues?: Value<number>;
  MaxLength?: Value<number>;
  MinValues?: Value<number>;
  MultipleOf?: Value<number>;
  constructor(properties: Validation) {
    Object.assign(this, properties);
  }
}
export interface DataTableAttributeProperties {
  Validation?: Validation;
  Description?: Value<string>;
  ValueType?: Value<string>;
  InstanceArn?: Value<string>;
  Primary?: Value<boolean>;
  DataTableArn?: Value<string>;
  Name?: Value<string>;
}
export default class DataTableAttribute extends ResourceBase<DataTableAttributeProperties> {
  static Enum = Enum;
  static LockVersion = LockVersion;
  static Validation = Validation;
  constructor(properties?: DataTableAttributeProperties) {
    super('AWS::Connect::DataTableAttribute', properties || {});
  }
}
