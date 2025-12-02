import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Dimension {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class Metric {
  MetricName?: Value<string>;
  Dimensions?: List<Dimension>;
  Namespace?: Value<string>;
  constructor(properties: Metric) {
    Object.assign(this, properties);
  }
}

export class MetricDataQuery {
  AccountId?: Value<string>;
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  Label?: Value<string>;
  MetricStat?: MetricStat;
  Period?: Value<number>;
  Id!: Value<string>;
  constructor(properties: MetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class MetricStat {
  Stat!: Value<string>;
  Period!: Value<number>;
  Metric!: Metric;
  Unit?: Value<string>;
  constructor(properties: MetricStat) {
    Object.assign(this, properties);
  }
}
export interface AlarmProperties {
  ThresholdMetricId?: Value<string>;
  EvaluateLowSampleCountPercentile?: Value<string>;
  ExtendedStatistic?: Value<string>;
  ComparisonOperator: Value<string>;
  TreatMissingData?: Value<string>;
  Dimensions?: List<Dimension>;
  Period?: Value<number>;
  EvaluationPeriods: Value<number>;
  Unit?: Value<string>;
  Namespace?: Value<string>;
  OKActions?: List<Value<string>>;
  AlarmActions?: List<Value<string>>;
  MetricName?: Value<string>;
  ActionsEnabled?: Value<boolean>;
  Metrics?: List<MetricDataQuery>;
  AlarmDescription?: Value<string>;
  AlarmName?: Value<string>;
  Statistic?: Value<string>;
  InsufficientDataActions?: List<Value<string>>;
  DatapointsToAlarm?: Value<number>;
  Tags?: List<ResourceTag>;
  Threshold?: Value<number>;
}
export default class Alarm extends ResourceBase<AlarmProperties> {
  static Dimension = Dimension;
  static Metric = Metric;
  static MetricDataQuery = MetricDataQuery;
  static MetricStat = MetricStat;
  constructor(properties: AlarmProperties) {
    super('AWS::CloudWatch::Alarm', properties);
  }
}
