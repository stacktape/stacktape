import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AlarmPromQLCriteria {
  PendingPeriod?: Value<number>;
  Query?: Value<string>;
  RecoveryPeriod?: Value<number>;
  constructor(properties: AlarmPromQLCriteria) {
    Object.assign(this, properties);
  }
}

export class Dimension {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class EvaluationCriteria {
  PromQLCriteria?: AlarmPromQLCriteria;
  constructor(properties: EvaluationCriteria) {
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
  ComparisonOperator?: Value<string>;
  TreatMissingData?: Value<string>;
  Dimensions?: List<Dimension>;
  Period?: Value<number>;
  EvaluationPeriods?: Value<number>;
  Unit?: Value<string>;
  EvaluationCriteria?: EvaluationCriteria;
  OKActions?: List<Value<string>>;
  Namespace?: Value<string>;
  AlarmActions?: List<Value<string>>;
  MetricName?: Value<string>;
  ActionsEnabled?: Value<boolean>;
  Metrics?: List<MetricDataQuery>;
  AlarmName?: Value<string>;
  Statistic?: Value<string>;
  AlarmDescription?: Value<string>;
  InsufficientDataActions?: List<Value<string>>;
  EvaluationInterval?: Value<number>;
  DatapointsToAlarm?: Value<number>;
  Tags?: List<ResourceTag>;
  Threshold?: Value<number>;
}
export default class Alarm extends ResourceBase<AlarmProperties> {
  static AlarmPromQLCriteria = AlarmPromQLCriteria;
  static Dimension = Dimension;
  static EvaluationCriteria = EvaluationCriteria;
  static Metric = Metric;
  static MetricDataQuery = MetricDataQuery;
  static MetricStat = MetricStat;
  constructor(properties?: AlarmProperties) {
    super('AWS::CloudWatch::Alarm', properties || {});
  }
}
