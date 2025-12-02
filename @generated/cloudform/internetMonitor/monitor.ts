import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HealthEventsConfig {
  AvailabilityLocalHealthEventsConfig?: LocalHealthEventsConfig;
  PerformanceScoreThreshold?: Value<number>;
  PerformanceLocalHealthEventsConfig?: LocalHealthEventsConfig;
  AvailabilityScoreThreshold?: Value<number>;
  constructor(properties: HealthEventsConfig) {
    Object.assign(this, properties);
  }
}

export class InternetMeasurementsLogDelivery {
  S3Config?: S3Config;
  constructor(properties: InternetMeasurementsLogDelivery) {
    Object.assign(this, properties);
  }
}

export class LocalHealthEventsConfig {
  Status?: Value<string>;
  HealthScoreThreshold?: Value<number>;
  MinTrafficImpact?: Value<number>;
  constructor(properties: LocalHealthEventsConfig) {
    Object.assign(this, properties);
  }
}

export class S3Config {
  BucketName?: Value<string>;
  LogDeliveryStatus?: Value<string>;
  BucketPrefix?: Value<string>;
  constructor(properties: S3Config) {
    Object.assign(this, properties);
  }
}
export interface MonitorProperties {
  Status?: Value<string>;
  LinkedAccountId?: Value<string>;
  TrafficPercentageToMonitor?: Value<number>;
  IncludeLinkedAccounts?: Value<boolean>;
  HealthEventsConfig?: HealthEventsConfig;
  ResourcesToAdd?: List<Value<string>>;
  InternetMeasurementsLogDelivery?: InternetMeasurementsLogDelivery;
  MonitorName: Value<string>;
  ResourcesToRemove?: List<Value<string>>;
  Resources?: List<Value<string>>;
  MaxCityNetworksToMonitor?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class Monitor extends ResourceBase<MonitorProperties> {
  static HealthEventsConfig = HealthEventsConfig;
  static InternetMeasurementsLogDelivery = InternetMeasurementsLogDelivery;
  static LocalHealthEventsConfig = LocalHealthEventsConfig;
  static S3Config = S3Config;
  constructor(properties: MonitorProperties) {
    super('AWS::InternetMonitor::Monitor', properties);
  }
}
