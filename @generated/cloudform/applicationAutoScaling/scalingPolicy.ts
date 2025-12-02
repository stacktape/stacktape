import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomizedMetricSpecification {
  MetricName?: Value<string>;
  Metrics?: List<TargetTrackingMetricDataQuery>;
  Statistic?: Value<string>;
  Dimensions?: List<MetricDimension>;
  Unit?: Value<string>;
  Namespace?: Value<string>;
  constructor(properties: CustomizedMetricSpecification) {
    Object.assign(this, properties);
  }
}

export class MetricDimension {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: MetricDimension) {
    Object.assign(this, properties);
  }
}

export class PredefinedMetricSpecification {
  PredefinedMetricType!: Value<string>;
  ResourceLabel?: Value<string>;
  constructor(properties: PredefinedMetricSpecification) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedCapacityMetric {
  MetricDataQueries!: List<PredictiveScalingMetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedCapacityMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedLoadMetric {
  MetricDataQueries!: List<PredictiveScalingMetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedLoadMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedScalingMetric {
  MetricDataQueries!: List<PredictiveScalingMetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedScalingMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingMetric {
  MetricName?: Value<string>;
  Dimensions?: List<PredictiveScalingMetricDimension>;
  Namespace?: Value<string>;
  constructor(properties: PredictiveScalingMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingMetricDataQuery {
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  Label?: Value<string>;
  MetricStat?: PredictiveScalingMetricStat;
  Id?: Value<string>;
  constructor(properties: PredictiveScalingMetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingMetricDimension {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: PredictiveScalingMetricDimension) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingMetricSpecification {
  CustomizedLoadMetricSpecification?: PredictiveScalingCustomizedLoadMetric;
  PredefinedLoadMetricSpecification?: PredictiveScalingPredefinedLoadMetric;
  TargetValue!: Value<number>;
  PredefinedScalingMetricSpecification?: PredictiveScalingPredefinedScalingMetric;
  CustomizedCapacityMetricSpecification?: PredictiveScalingCustomizedCapacityMetric;
  CustomizedScalingMetricSpecification?: PredictiveScalingCustomizedScalingMetric;
  PredefinedMetricPairSpecification?: PredictiveScalingPredefinedMetricPair;
  constructor(properties: PredictiveScalingMetricSpecification) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingMetricStat {
  Stat?: Value<string>;
  Metric?: PredictiveScalingMetric;
  Unit?: Value<string>;
  constructor(properties: PredictiveScalingMetricStat) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingPolicyConfiguration {
  MaxCapacityBreachBehavior?: Value<string>;
  MaxCapacityBuffer?: Value<number>;
  Mode?: Value<string>;
  MetricSpecifications!: List<PredictiveScalingMetricSpecification>;
  SchedulingBufferTime?: Value<number>;
  constructor(properties: PredictiveScalingPolicyConfiguration) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingPredefinedLoadMetric {
  PredefinedMetricType!: Value<string>;
  ResourceLabel?: Value<string>;
  constructor(properties: PredictiveScalingPredefinedLoadMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingPredefinedMetricPair {
  PredefinedMetricType!: Value<string>;
  ResourceLabel?: Value<string>;
  constructor(properties: PredictiveScalingPredefinedMetricPair) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingPredefinedScalingMetric {
  PredefinedMetricType!: Value<string>;
  ResourceLabel?: Value<string>;
  constructor(properties: PredictiveScalingPredefinedScalingMetric) {
    Object.assign(this, properties);
  }
}

export class StepAdjustment {
  MetricIntervalUpperBound?: Value<number>;
  MetricIntervalLowerBound?: Value<number>;
  ScalingAdjustment!: Value<number>;
  constructor(properties: StepAdjustment) {
    Object.assign(this, properties);
  }
}

export class StepScalingPolicyConfiguration {
  MetricAggregationType?: Value<string>;
  Cooldown?: Value<number>;
  StepAdjustments?: List<StepAdjustment>;
  MinAdjustmentMagnitude?: Value<number>;
  AdjustmentType?: Value<string>;
  constructor(properties: StepScalingPolicyConfiguration) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetric {
  MetricName?: Value<string>;
  Dimensions?: List<TargetTrackingMetricDimension>;
  Namespace?: Value<string>;
  constructor(properties: TargetTrackingMetric) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetricDataQuery {
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  Label?: Value<string>;
  MetricStat?: TargetTrackingMetricStat;
  Id?: Value<string>;
  constructor(properties: TargetTrackingMetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetricDimension {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: TargetTrackingMetricDimension) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetricStat {
  Stat?: Value<string>;
  Metric?: TargetTrackingMetric;
  Unit?: Value<string>;
  constructor(properties: TargetTrackingMetricStat) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingScalingPolicyConfiguration {
  ScaleOutCooldown?: Value<number>;
  TargetValue!: Value<number>;
  CustomizedMetricSpecification?: CustomizedMetricSpecification;
  DisableScaleIn?: Value<boolean>;
  ScaleInCooldown?: Value<number>;
  PredefinedMetricSpecification?: PredefinedMetricSpecification;
  constructor(properties: TargetTrackingScalingPolicyConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ScalingPolicyProperties {
  PolicyType: Value<string>;
  ResourceId?: Value<string>;
  ScalingTargetId?: Value<string>;
  PolicyName: Value<string>;
  ServiceNamespace?: Value<string>;
  ScalableDimension?: Value<string>;
  TargetTrackingScalingPolicyConfiguration?: TargetTrackingScalingPolicyConfiguration;
  StepScalingPolicyConfiguration?: StepScalingPolicyConfiguration;
  PredictiveScalingPolicyConfiguration?: PredictiveScalingPolicyConfiguration;
}
export default class ScalingPolicy extends ResourceBase<ScalingPolicyProperties> {
  static CustomizedMetricSpecification = CustomizedMetricSpecification;
  static MetricDimension = MetricDimension;
  static PredefinedMetricSpecification = PredefinedMetricSpecification;
  static PredictiveScalingCustomizedCapacityMetric = PredictiveScalingCustomizedCapacityMetric;
  static PredictiveScalingCustomizedLoadMetric = PredictiveScalingCustomizedLoadMetric;
  static PredictiveScalingCustomizedScalingMetric = PredictiveScalingCustomizedScalingMetric;
  static PredictiveScalingMetric = PredictiveScalingMetric;
  static PredictiveScalingMetricDataQuery = PredictiveScalingMetricDataQuery;
  static PredictiveScalingMetricDimension = PredictiveScalingMetricDimension;
  static PredictiveScalingMetricSpecification = PredictiveScalingMetricSpecification;
  static PredictiveScalingMetricStat = PredictiveScalingMetricStat;
  static PredictiveScalingPolicyConfiguration = PredictiveScalingPolicyConfiguration;
  static PredictiveScalingPredefinedLoadMetric = PredictiveScalingPredefinedLoadMetric;
  static PredictiveScalingPredefinedMetricPair = PredictiveScalingPredefinedMetricPair;
  static PredictiveScalingPredefinedScalingMetric = PredictiveScalingPredefinedScalingMetric;
  static StepAdjustment = StepAdjustment;
  static StepScalingPolicyConfiguration = StepScalingPolicyConfiguration;
  static TargetTrackingMetric = TargetTrackingMetric;
  static TargetTrackingMetricDataQuery = TargetTrackingMetricDataQuery;
  static TargetTrackingMetricDimension = TargetTrackingMetricDimension;
  static TargetTrackingMetricStat = TargetTrackingMetricStat;
  static TargetTrackingScalingPolicyConfiguration = TargetTrackingScalingPolicyConfiguration;
  constructor(properties: ScalingPolicyProperties) {
    super('AWS::ApplicationAutoScaling::ScalingPolicy', properties);
  }
}
