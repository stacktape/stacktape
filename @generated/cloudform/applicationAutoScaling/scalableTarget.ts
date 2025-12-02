import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ScalableTargetAction {
  MinCapacity?: Value<number>;
  MaxCapacity?: Value<number>;
  constructor(properties: ScalableTargetAction) {
    Object.assign(this, properties);
  }
}

export class ScheduledAction {
  Timezone?: Value<string>;
  ScheduledActionName!: Value<string>;
  EndTime?: Value<string>;
  Schedule!: Value<string>;
  StartTime?: Value<string>;
  ScalableTargetAction?: ScalableTargetAction;
  constructor(properties: ScheduledAction) {
    Object.assign(this, properties);
  }
}

export class SuspendedState {
  DynamicScalingOutSuspended?: Value<boolean>;
  ScheduledScalingSuspended?: Value<boolean>;
  DynamicScalingInSuspended?: Value<boolean>;
  constructor(properties: SuspendedState) {
    Object.assign(this, properties);
  }
}
export interface ScalableTargetProperties {
  ScheduledActions?: List<ScheduledAction>;
  ResourceId: Value<string>;
  ServiceNamespace: Value<string>;
  ScalableDimension: Value<string>;
  SuspendedState?: SuspendedState;
  MinCapacity: Value<number>;
  RoleARN?: Value<string>;
  MaxCapacity: Value<number>;
}
export default class ScalableTarget extends ResourceBase<ScalableTargetProperties> {
  static ScalableTargetAction = ScalableTargetAction;
  static ScheduledAction = ScheduledAction;
  static SuspendedState = SuspendedState;
  constructor(properties: ScalableTargetProperties) {
    super('AWS::ApplicationAutoScaling::ScalableTarget', properties);
  }
}
