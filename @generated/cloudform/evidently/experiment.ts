import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MetricGoalObject {
  EntityIdKey!: Value<string>;
  DesiredChange!: Value<string>;
  MetricName!: Value<string>;
  EventPattern?: Value<string>;
  ValueKey!: Value<string>;
  UnitLabel?: Value<string>;
  constructor(properties: MetricGoalObject) {
    Object.assign(this, properties);
  }
}

export class OnlineAbConfigObject {
  TreatmentWeights?: List<TreatmentToWeight>;
  ControlTreatmentName?: Value<string>;
  constructor(properties: OnlineAbConfigObject) {
    Object.assign(this, properties);
  }
}

export class RunningStatusObject {
  Status!: Value<string>;
  DesiredState?: Value<string>;
  AnalysisCompleteTime?: Value<string>;
  Reason?: Value<string>;
  constructor(properties: RunningStatusObject) {
    Object.assign(this, properties);
  }
}

export class TreatmentObject {
  Description?: Value<string>;
  Variation!: Value<string>;
  Feature!: Value<string>;
  TreatmentName!: Value<string>;
  constructor(properties: TreatmentObject) {
    Object.assign(this, properties);
  }
}

export class TreatmentToWeight {
  Treatment!: Value<string>;
  SplitWeight!: Value<number>;
  constructor(properties: TreatmentToWeight) {
    Object.assign(this, properties);
  }
}
export interface ExperimentProperties {
  Project: Value<string>;
  RunningStatus?: RunningStatusObject;
  Description?: Value<string>;
  MetricGoals: List<MetricGoalObject>;
  OnlineAbConfig: OnlineAbConfigObject;
  RemoveSegment?: Value<boolean>;
  RandomizationSalt?: Value<string>;
  Treatments: List<TreatmentObject>;
  SamplingRate?: Value<number>;
  Segment?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Experiment extends ResourceBase<ExperimentProperties> {
  static MetricGoalObject = MetricGoalObject;
  static OnlineAbConfigObject = OnlineAbConfigObject;
  static RunningStatusObject = RunningStatusObject;
  static TreatmentObject = TreatmentObject;
  static TreatmentToWeight = TreatmentToWeight;
  constructor(properties: ExperimentProperties) {
    super('AWS::Evidently::Experiment', properties);
  }
}
