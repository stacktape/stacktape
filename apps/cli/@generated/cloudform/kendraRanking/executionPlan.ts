import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityUnitsConfiguration {
  RescoreCapacityUnits!: Value<number>;
  constructor(properties: CapacityUnitsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ExecutionPlanProperties {
  Description?: Value<string>;
  CapacityUnits?: CapacityUnitsConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ExecutionPlan extends ResourceBase<ExecutionPlanProperties> {
  static CapacityUnitsConfiguration = CapacityUnitsConfiguration;
  constructor(properties: ExecutionPlanProperties) {
    super('AWS::KendraRanking::ExecutionPlan', properties);
  }
}
