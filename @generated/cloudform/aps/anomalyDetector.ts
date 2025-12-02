import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnomalyDetectorConfiguration {
  RandomCutForest!: RandomCutForestConfiguration;
  constructor(properties: AnomalyDetectorConfiguration) {
    Object.assign(this, properties);
  }
}

export class IgnoreNearExpected {
  Amount?: Value<number>;
  Ratio?: Value<number>;
  constructor(properties: IgnoreNearExpected) {
    Object.assign(this, properties);
  }
}

export class Label {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: Label) {
    Object.assign(this, properties);
  }
}

export class MissingDataAction {
  MarkAsAnomaly?: Value<boolean>;
  Skip?: Value<boolean>;
  constructor(properties: MissingDataAction) {
    Object.assign(this, properties);
  }
}

export class RandomCutForestConfiguration {
  SampleSize?: Value<number>;
  Query!: Value<string>;
  ShingleSize?: Value<number>;
  IgnoreNearExpectedFromBelow?: IgnoreNearExpected;
  IgnoreNearExpectedFromAbove?: IgnoreNearExpected;
  constructor(properties: RandomCutForestConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AnomalyDetectorProperties {
  Configuration: AnomalyDetectorConfiguration;
  Alias: Value<string>;
  MissingDataAction?: MissingDataAction;
  Labels?: List<Label>;
  EvaluationIntervalInSeconds?: Value<number>;
  Tags?: List<ResourceTag>;
  Workspace: Value<string>;
}
export default class AnomalyDetector extends ResourceBase<AnomalyDetectorProperties> {
  static AnomalyDetectorConfiguration = AnomalyDetectorConfiguration;
  static IgnoreNearExpected = IgnoreNearExpected;
  static Label = Label;
  static MissingDataAction = MissingDataAction;
  static RandomCutForestConfiguration = RandomCutForestConfiguration;
  constructor(properties: AnomalyDetectorProperties) {
    super('AWS::APS::AnomalyDetector', properties);
  }
}
