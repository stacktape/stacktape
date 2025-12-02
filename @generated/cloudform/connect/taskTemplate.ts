import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Constraints {
  ReadOnlyFields?: List<ReadOnlyFieldInfo>;
  InvisibleFields?: List<InvisibleFieldInfo>;
  RequiredFields?: List<RequiredFieldInfo>;
  constructor(properties: Constraints) {
    Object.assign(this, properties);
  }
}

export class DefaultFieldValue {
  DefaultValue!: Value<string>;
  Id!: FieldIdentifier;
  constructor(properties: DefaultFieldValue) {
    Object.assign(this, properties);
  }
}

export class Field {
  Type!: Value<string>;
  Description?: Value<string>;
  Id!: FieldIdentifier;
  SingleSelectOptions?: List<Value<string>>;
  constructor(properties: Field) {
    Object.assign(this, properties);
  }
}

export class FieldIdentifier {
  Name!: Value<string>;
  constructor(properties: FieldIdentifier) {
    Object.assign(this, properties);
  }
}

export class InvisibleFieldInfo {
  Id!: FieldIdentifier;
  constructor(properties: InvisibleFieldInfo) {
    Object.assign(this, properties);
  }
}

export class ReadOnlyFieldInfo {
  Id!: FieldIdentifier;
  constructor(properties: ReadOnlyFieldInfo) {
    Object.assign(this, properties);
  }
}

export class RequiredFieldInfo {
  Id!: FieldIdentifier;
  constructor(properties: RequiredFieldInfo) {
    Object.assign(this, properties);
  }
}
export interface TaskTemplateProperties {
  Status?: Value<string>;
  Description?: Value<string>;
  Constraints?: Constraints;
  Defaults?: List<DefaultFieldValue>;
  Fields?: List<Field>;
  InstanceArn: Value<string>;
  ContactFlowArn?: Value<string>;
  ClientToken?: Value<string>;
  SelfAssignContactFlowArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class TaskTemplate extends ResourceBase<TaskTemplateProperties> {
  static Constraints = Constraints;
  static DefaultFieldValue = DefaultFieldValue;
  static Field = Field;
  static FieldIdentifier = FieldIdentifier;
  static InvisibleFieldInfo = InvisibleFieldInfo;
  static ReadOnlyFieldInfo = ReadOnlyFieldInfo;
  static RequiredFieldInfo = RequiredFieldInfo;
  constructor(properties: TaskTemplateProperties) {
    super('AWS::Connect::TaskTemplate', properties);
  }
}
