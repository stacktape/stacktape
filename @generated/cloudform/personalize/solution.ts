import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AlgorithmHyperParameterRanges {
  IntegerHyperParameterRanges?: List<IntegerHyperParameterRange>;
  CategoricalHyperParameterRanges?: List<CategoricalHyperParameterRange>;
  ContinuousHyperParameterRanges?: List<ContinuousHyperParameterRange>;
  constructor(properties: AlgorithmHyperParameterRanges) {
    Object.assign(this, properties);
  }
}

export class AutoMLConfig {
  MetricName?: Value<string>;
  RecipeList?: List<Value<string>>;
  constructor(properties: AutoMLConfig) {
    Object.assign(this, properties);
  }
}

export class CategoricalHyperParameterRange {
  Values?: List<Value<string>>;
  Name?: Value<string>;
  constructor(properties: CategoricalHyperParameterRange) {
    Object.assign(this, properties);
  }
}

export class ContinuousHyperParameterRange {
  MinValue?: Value<number>;
  MaxValue?: Value<number>;
  Name?: Value<string>;
  constructor(properties: ContinuousHyperParameterRange) {
    Object.assign(this, properties);
  }
}

export class HpoConfig {
  HpoResourceConfig?: HpoResourceConfig;
  AlgorithmHyperParameterRanges?: AlgorithmHyperParameterRanges;
  HpoObjective?: HpoObjective;
  constructor(properties: HpoConfig) {
    Object.assign(this, properties);
  }
}

export class HpoObjective {
  MetricName?: Value<string>;
  Type?: Value<string>;
  MetricRegex?: Value<string>;
  constructor(properties: HpoObjective) {
    Object.assign(this, properties);
  }
}

export class HpoResourceConfig {
  MaxParallelTrainingJobs?: Value<string>;
  MaxNumberOfTrainingJobs?: Value<string>;
  constructor(properties: HpoResourceConfig) {
    Object.assign(this, properties);
  }
}

export class IntegerHyperParameterRange {
  MinValue?: Value<number>;
  MaxValue?: Value<number>;
  Name?: Value<string>;
  constructor(properties: IntegerHyperParameterRange) {
    Object.assign(this, properties);
  }
}

export class SolutionConfig {
  EventValueThreshold?: Value<string>;
  HpoConfig?: HpoConfig;
  AlgorithmHyperParameters?: { [key: string]: Value<string> };
  FeatureTransformationParameters?: { [key: string]: Value<string> };
  AutoMLConfig?: AutoMLConfig;
  constructor(properties: SolutionConfig) {
    Object.assign(this, properties);
  }
}
export interface SolutionProperties {
  PerformAutoML?: Value<boolean>;
  PerformHPO?: Value<boolean>;
  EventType?: Value<string>;
  DatasetGroupArn: Value<string>;
  SolutionConfig?: SolutionConfig;
  RecipeArn?: Value<string>;
  Name: Value<string>;
}
export default class Solution extends ResourceBase<SolutionProperties> {
  static AlgorithmHyperParameterRanges = AlgorithmHyperParameterRanges;
  static AutoMLConfig = AutoMLConfig;
  static CategoricalHyperParameterRange = CategoricalHyperParameterRange;
  static ContinuousHyperParameterRange = ContinuousHyperParameterRange;
  static HpoConfig = HpoConfig;
  static HpoObjective = HpoObjective;
  static HpoResourceConfig = HpoResourceConfig;
  static IntegerHyperParameterRange = IntegerHyperParameterRange;
  static SolutionConfig = SolutionConfig;
  constructor(properties: SolutionProperties) {
    super('AWS::Personalize::Solution', properties);
  }
}
