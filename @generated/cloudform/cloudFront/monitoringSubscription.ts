import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class MonitoringSubscriptionInner {
  RealtimeMetricsSubscriptionConfig?: RealtimeMetricsSubscriptionConfig;
  constructor(properties: MonitoringSubscriptionInner) {
    Object.assign(this, properties);
  }
}

export class RealtimeMetricsSubscriptionConfig {
  RealtimeMetricsSubscriptionStatus!: Value<string>;
  constructor(properties: RealtimeMetricsSubscriptionConfig) {
    Object.assign(this, properties);
  }
}
export interface MonitoringSubscriptionProperties {
  MonitoringSubscription: MonitoringSubscription;
  DistributionId: Value<string>;
}
export default class MonitoringSubscription extends ResourceBase<MonitoringSubscriptionProperties> {
  static MonitoringSubscription = MonitoringSubscriptionInner;
  static RealtimeMetricsSubscriptionConfig = RealtimeMetricsSubscriptionConfig;
  constructor(properties: MonitoringSubscriptionProperties) {
    super('AWS::CloudFront::MonitoringSubscription', properties);
  }
}
