import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MetricStreamFilter {
  MetricNames?: List<Value<string>>;
  Namespace!: Value<string>;
  constructor(properties: MetricStreamFilter) {
    Object.assign(this, properties);
  }
}

export class MetricStreamStatisticsConfiguration {
  IncludeMetrics!: List<MetricStreamStatisticsMetric>;
  AdditionalStatistics!: List<Value<string>>;
  constructor(properties: MetricStreamStatisticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetricStreamStatisticsMetric {
  MetricName!: Value<string>;
  Namespace!: Value<string>;
  constructor(properties: MetricStreamStatisticsMetric) {
    Object.assign(this, properties);
  }
}
export interface MetricStreamProperties {
  StatisticsConfigurations?: List<MetricStreamStatisticsConfiguration>;
  FirehoseArn: Value<string>;
  IncludeLinkedAccountsMetrics?: Value<boolean>;
  IncludeFilters?: List<MetricStreamFilter>;
  OutputFormat: Value<string>;
  ExcludeFilters?: List<MetricStreamFilter>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class MetricStream extends ResourceBase<MetricStreamProperties> {
  static MetricStreamFilter = MetricStreamFilter;
  static MetricStreamStatisticsConfiguration = MetricStreamStatisticsConfiguration;
  static MetricStreamStatisticsMetric = MetricStreamStatisticsMetric;
  constructor(properties: MetricStreamProperties) {
    super('AWS::CloudWatch::MetricStream', properties);
  }
}
