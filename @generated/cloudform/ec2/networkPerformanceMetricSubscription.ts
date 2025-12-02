import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface NetworkPerformanceMetricSubscriptionProperties {
  Destination: Value<string>;
  Statistic: Value<string>;
  Metric: Value<string>;
  Source: Value<string>;
}
export default class NetworkPerformanceMetricSubscription extends ResourceBase<NetworkPerformanceMetricSubscriptionProperties> {
  constructor(properties: NetworkPerformanceMetricSubscriptionProperties) {
    super('AWS::EC2::NetworkPerformanceMetricSubscription', properties);
  }
}
