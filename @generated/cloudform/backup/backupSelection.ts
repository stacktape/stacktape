import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BackupSelectionResourceType {
  ListOfTags?: List<ConditionResourceType>;
  NotResources?: List<Value<string>>;
  SelectionName!: Value<string>;
  IamRoleArn!: Value<string>;
  Resources?: List<Value<string>>;
  Conditions?: Conditions;
  constructor(properties: BackupSelectionResourceType) {
    Object.assign(this, properties);
  }
}

export class ConditionParameter {
  ConditionValue?: Value<string>;
  ConditionKey?: Value<string>;
  constructor(properties: ConditionParameter) {
    Object.assign(this, properties);
  }
}

export class ConditionResourceType {
  ConditionValue!: Value<string>;
  ConditionKey!: Value<string>;
  ConditionType!: Value<string>;
  constructor(properties: ConditionResourceType) {
    Object.assign(this, properties);
  }
}

export class Conditions {
  StringEquals?: List<ConditionParameter>;
  StringNotLike?: List<ConditionParameter>;
  StringLike?: List<ConditionParameter>;
  StringNotEquals?: List<ConditionParameter>;
  constructor(properties: Conditions) {
    Object.assign(this, properties);
  }
}
export interface BackupSelectionProperties {
  BackupSelection: BackupSelectionResourceType;
  BackupPlanId: Value<string>;
}
export default class BackupSelection extends ResourceBase<BackupSelectionProperties> {
  static BackupSelectionResourceType = BackupSelectionResourceType;
  static ConditionParameter = ConditionParameter;
  static ConditionResourceType = ConditionResourceType;
  static Conditions = Conditions;
  constructor(properties: BackupSelectionProperties) {
    super('AWS::Backup::BackupSelection', properties);
  }
}
