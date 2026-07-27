import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AlertTarget {
  AlertTargetArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: AlertTarget) {
    Object.assign(this, properties);
  }
}

export class Behavior {
  ExportMetric?: Value<boolean>;
  SuppressAlerts?: Value<boolean>;
  Metric?: Value<string>;
  Criteria?: BehaviorCriteria;
  MetricDimension?: MetricDimension;
  Name!: Value<string>;
  constructor(properties: Behavior) {
    Object.assign(this, properties);
  }
}

export class BehaviorCriteria {
  ComparisonOperator?: Value<string>;
  MlDetectionConfig?: MachineLearningDetectionConfig;
  Value?: MetricValue;
  StatisticalThreshold?: StatisticalThreshold;
  DurationSeconds?: Value<number>;
  ConsecutiveDatapointsToAlarm?: Value<number>;
  ConsecutiveDatapointsToClear?: Value<number>;
  constructor(properties: BehaviorCriteria) {
    Object.assign(this, properties);
  }
}

export class MachineLearningDetectionConfig {
  ConfidenceLevel?: Value<string>;
  constructor(properties: MachineLearningDetectionConfig) {
    Object.assign(this, properties);
  }
}

export class MetricDimension {
  Operator?: Value<string>;
  DimensionName!: Value<string>;
  constructor(properties: MetricDimension) {
    Object.assign(this, properties);
  }
}

export class MetricToRetain {
  ExportMetric?: Value<boolean>;
  Metric!: Value<string>;
  MetricDimension?: MetricDimension;
  constructor(properties: MetricToRetain) {
    Object.assign(this, properties);
  }
}

export class MetricValue {
  Numbers?: List<Value<number>>;
  Number?: Value<number>;
  Ports?: List<Value<number>>;
  Count?: Value<string>;
  Strings?: List<Value<string>>;
  Cidrs?: List<Value<string>>;
  constructor(properties: MetricValue) {
    Object.assign(this, properties);
  }
}

export class MetricsExportConfig {
  MqttTopic!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: MetricsExportConfig) {
    Object.assign(this, properties);
  }
}

export class StatisticalThreshold {
  Statistic?: Value<string>;
  constructor(properties: StatisticalThreshold) {
    Object.assign(this, properties);
  }
}
export interface SecurityProfileProperties {
  AdditionalMetricsToRetainV2?: List<MetricToRetain>;
  MetricsExportConfig?: MetricsExportConfig;
  SecurityProfileDescription?: Value<string>;
  Behaviors?: List<Behavior>;
  SecurityProfileName?: Value<string>;
  AlertTargets?: { [key: string]: AlertTarget };
  TargetArns?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class SecurityProfile extends ResourceBase<SecurityProfileProperties> {
  static AlertTarget = AlertTarget;
  static Behavior = Behavior;
  static BehaviorCriteria = BehaviorCriteria;
  static MachineLearningDetectionConfig = MachineLearningDetectionConfig;
  static MetricDimension = MetricDimension;
  static MetricToRetain = MetricToRetain;
  static MetricValue = MetricValue;
  static MetricsExportConfig = MetricsExportConfig;
  static StatisticalThreshold = StatisticalThreshold;
  constructor(properties?: SecurityProfileProperties) {
    super('AWS::IoT::SecurityProfile', properties || {});
  }
}
