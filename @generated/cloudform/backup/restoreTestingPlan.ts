import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RestoreTestingRecoveryPointSelection {
  SelectionWindowDays?: Value<number>;
  RecoveryPointTypes!: List<Value<string>>;
  IncludeVaults!: List<Value<string>>;
  ExcludeVaults?: List<Value<string>>;
  Algorithm!: Value<string>;
  constructor(properties: RestoreTestingRecoveryPointSelection) {
    Object.assign(this, properties);
  }
}
export interface RestoreTestingPlanProperties {
  ScheduleExpression: Value<string>;
  StartWindowHours?: Value<number>;
  RecoveryPointSelection: RestoreTestingRecoveryPointSelection;
  RestoreTestingPlanName: Value<string>;
  ScheduleExpressionTimezone?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class RestoreTestingPlan extends ResourceBase<RestoreTestingPlanProperties> {
  static RestoreTestingRecoveryPointSelection = RestoreTestingRecoveryPointSelection;
  constructor(properties: RestoreTestingPlanProperties) {
    super('AWS::Backup::RestoreTestingPlan', properties);
  }
}
