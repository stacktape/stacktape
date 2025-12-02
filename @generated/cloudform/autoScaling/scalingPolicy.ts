import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomizedMetricSpecification {
  MetricName?: Value<string>;
  Metrics?: List<TargetTrackingMetricDataQuery>;
  Statistic?: Value<string>;
  Dimensions?: List<MetricDimension>;
  Period?: Value<number>;
  Unit?: Value<string>;
  Namespace?: Value<string>;
  constructor(properties: CustomizedMetricSpecification) {
    Object.assign(this, properties);
  }
}

export class Metric {
  MetricName!: Value<string>;
  Dimensions?: List<MetricDimension>;
  Namespace!: Value<string>;
  constructor(properties: Metric) {
    Object.assign(this, properties);
  }
}

export class MetricDataQuery {
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  Label?: Value<string>;
  MetricStat?: MetricStat;
  Id!: Value<string>;
  constructor(properties: MetricDataQuery) {
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

export class MetricStat {
  Stat!: Value<string>;
  Metric!: Metric;
  Unit?: Value<string>;
  constructor(properties: MetricStat) {
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

export class PredictiveScalingConfiguration {
  MaxCapacityBreachBehavior?: Value<string>;
  MaxCapacityBuffer?: Value<number>;
  Mode?: Value<string>;
  MetricSpecifications!: List<PredictiveScalingMetricSpecification>;
  SchedulingBufferTime?: Value<number>;
  constructor(properties: PredictiveScalingConfiguration) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedCapacityMetric {
  MetricDataQueries!: List<MetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedCapacityMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedLoadMetric {
  MetricDataQueries!: List<MetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedLoadMetric) {
    Object.assign(this, properties);
  }
}

export class PredictiveScalingCustomizedScalingMetric {
  MetricDataQueries!: List<MetricDataQuery>;
  constructor(properties: PredictiveScalingCustomizedScalingMetric) {
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

export class TargetTrackingConfiguration {
  TargetValue!: Value<number>;
  CustomizedMetricSpecification?: CustomizedMetricSpecification;
  DisableScaleIn?: Value<boolean>;
  PredefinedMetricSpecification?: PredefinedMetricSpecification;
  constructor(properties: TargetTrackingConfiguration) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetricDataQuery {
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  Label?: Value<string>;
  MetricStat?: TargetTrackingMetricStat;
  Period?: Value<number>;
  Id!: Value<string>;
  constructor(properties: TargetTrackingMetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingMetricStat {
  Stat!: Value<string>;
  Period?: Value<number>;
  Metric!: Metric;
  Unit?: Value<string>;
  constructor(properties: TargetTrackingMetricStat) {
    Object.assign(this, properties);
  }
}
export interface ScalingPolicyProperties {
  MetricAggregationType?: Value<string>;
  PolicyType?: Value<string>;
  PredictiveScalingConfiguration?: PredictiveScalingConfiguration;
  ScalingAdjustment?: Value<number>;
  Cooldown?: Value<string>;
  StepAdjustments?: List<StepAdjustment>;
  AutoScalingGroupName: Value<string>;
  MinAdjustmentMagnitude?: Value<number>;
  TargetTrackingConfiguration?: TargetTrackingConfiguration;
  EstimatedInstanceWarmup?: Value<number>;
  AdjustmentType?: Value<string>;
}
export default class ScalingPolicy extends ResourceBase<ScalingPolicyProperties> {
  static CustomizedMetricSpecification = CustomizedMetricSpecification;
  static Metric = Metric;
  static MetricDataQuery = MetricDataQuery;
  static MetricDimension = MetricDimension;
  static MetricStat = MetricStat;
  static PredefinedMetricSpecification = PredefinedMetricSpecification;
  static PredictiveScalingConfiguration = PredictiveScalingConfiguration;
  static PredictiveScalingCustomizedCapacityMetric = PredictiveScalingCustomizedCapacityMetric;
  static PredictiveScalingCustomizedLoadMetric = PredictiveScalingCustomizedLoadMetric;
  static PredictiveScalingCustomizedScalingMetric = PredictiveScalingCustomizedScalingMetric;
  static PredictiveScalingMetricSpecification = PredictiveScalingMetricSpecification;
  static PredictiveScalingPredefinedLoadMetric = PredictiveScalingPredefinedLoadMetric;
  static PredictiveScalingPredefinedMetricPair = PredictiveScalingPredefinedMetricPair;
  static PredictiveScalingPredefinedScalingMetric = PredictiveScalingPredefinedScalingMetric;
  static StepAdjustment = StepAdjustment;
  static TargetTrackingConfiguration = TargetTrackingConfiguration;
  static TargetTrackingMetricDataQuery = TargetTrackingMetricDataQuery;
  static TargetTrackingMetricStat = TargetTrackingMetricStat;
  constructor(properties: ScalingPolicyProperties) {
    super('AWS::AutoScaling::ScalingPolicy', properties);
  }
}
