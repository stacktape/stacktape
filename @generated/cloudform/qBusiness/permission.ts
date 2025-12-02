import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Condition {
  ConditionOperator!: Value<string>;
  ConditionValues!: List<Value<string>>;
  ConditionKey!: Value<string>;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}
export interface PermissionProperties {
  Actions: List<Value<string>>;
  StatementId: Value<string>;
  ApplicationId: Value<string>;
  Conditions?: List<Condition>;
  Principal: Value<string>;
}
export default class Permission extends ResourceBase<PermissionProperties> {
  static Condition = Condition;
  constructor(properties: PermissionProperties) {
    super('AWS::QBusiness::Permission', properties);
  }
}
