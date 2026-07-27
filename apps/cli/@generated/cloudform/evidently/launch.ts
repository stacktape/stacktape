import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ExecutionStatusObject {
  Status!: Value<string>;
  DesiredState?: Value<string>;
  Reason?: Value<string>;
  constructor(properties: ExecutionStatusObject) {
    Object.assign(this, properties);
  }
}

export class GroupToWeight {
  GroupName!: Value<string>;
  SplitWeight!: Value<number>;
  constructor(properties: GroupToWeight) {
    Object.assign(this, properties);
  }
}

export class LaunchGroupObject {
  GroupName!: Value<string>;
  Description?: Value<string>;
  Variation!: Value<string>;
  Feature!: Value<string>;
  constructor(properties: LaunchGroupObject) {
    Object.assign(this, properties);
  }
}

export class MetricDefinitionObject {
  EntityIdKey!: Value<string>;
  MetricName!: Value<string>;
  EventPattern?: Value<string>;
  ValueKey!: Value<string>;
  UnitLabel?: Value<string>;
  constructor(properties: MetricDefinitionObject) {
    Object.assign(this, properties);
  }
}

export class SegmentOverride {
  Weights!: List<GroupToWeight>;
  EvaluationOrder!: Value<number>;
  Segment!: Value<string>;
  constructor(properties: SegmentOverride) {
    Object.assign(this, properties);
  }
}

export class StepConfig {
  GroupWeights!: List<GroupToWeight>;
  SegmentOverrides?: List<SegmentOverride>;
  StartTime!: Value<string>;
  constructor(properties: StepConfig) {
    Object.assign(this, properties);
  }
}
export interface LaunchProperties {
  Project: Value<string>;
  Description?: Value<string>;
  ExecutionStatus?: ExecutionStatusObject;
  Groups: List<LaunchGroupObject>;
  RandomizationSalt?: Value<string>;
  MetricMonitors?: List<MetricDefinitionObject>;
  ScheduledSplitsConfig: List<StepConfig>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Launch extends ResourceBase<LaunchProperties> {
  static ExecutionStatusObject = ExecutionStatusObject;
  static GroupToWeight = GroupToWeight;
  static LaunchGroupObject = LaunchGroupObject;
  static MetricDefinitionObject = MetricDefinitionObject;
  static SegmentOverride = SegmentOverride;
  static StepConfig = StepConfig;
  constructor(properties: LaunchProperties) {
    super('AWS::Evidently::Launch', properties);
  }
}
