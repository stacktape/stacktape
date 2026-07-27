import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Configuration {
  MetricTimeZone?: Value<string>;
  ExcludedTimeRanges?: List<Range>;
  constructor(properties: Configuration) {
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

export class Metric {
  MetricName!: Value<string>;
  Dimensions?: List<Dimension>;
  Namespace!: Value<string>;
  constructor(properties: Metric) {
    Object.assign(this, properties);
  }
}

export class MetricCharacteristics {
  PeriodicSpikes?: Value<boolean>;
  constructor(properties: MetricCharacteristics) {
    Object.assign(this, properties);
  }
}

export type MetricDataQueries = List<MetricDataQuery>;

export class MetricDataQuery {
  AccountId?: Value<string>;
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  MetricStat?: MetricStat;
  Label?: Value<string>;
  Period?: Value<number>;
  Id!: Value<string>;
  constructor(properties: MetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class MetricMathAnomalyDetector {
  MetricDataQueries?: List<MetricDataQuery>;
  constructor(properties: MetricMathAnomalyDetector) {
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

export class Range {
  EndTime!: Value<string>;
  StartTime!: Value<string>;
  constructor(properties: Range) {
    Object.assign(this, properties);
  }
}

export class SingleMetricAnomalyDetector {
  MetricName?: Value<string>;
  AccountId?: Value<string>;
  Stat?: Value<string>;
  Dimensions?: List<Dimension>;
  Namespace?: Value<string>;
  constructor(properties: SingleMetricAnomalyDetector) {
    Object.assign(this, properties);
  }
}
export interface AnomalyDetectorProperties {
  MetricCharacteristics?: MetricCharacteristics;
  MetricName?: Value<string>;
  Stat?: Value<string>;
  Configuration?: Configuration;
  MetricMathAnomalyDetector?: MetricMathAnomalyDetector;
  Dimensions?: List<Dimension>;
  Namespace?: Value<string>;
  SingleMetricAnomalyDetector?: SingleMetricAnomalyDetector;
}
export default class AnomalyDetector extends ResourceBase<AnomalyDetectorProperties> {
  static Configuration = Configuration;
  static Dimension = Dimension;
  static Metric = Metric;
  static MetricCharacteristics = MetricCharacteristics;
  static MetricDataQuery = MetricDataQuery;
  static MetricMathAnomalyDetector = MetricMathAnomalyDetector;
  static MetricStat = MetricStat;
  static Range = Range;
  static SingleMetricAnomalyDetector = SingleMetricAnomalyDetector;
  constructor(properties?: AnomalyDetectorProperties) {
    super('AWS::CloudWatch::AnomalyDetector', properties || {});
  }
}
