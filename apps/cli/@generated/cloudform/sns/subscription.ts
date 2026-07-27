import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SubscriptionProperties {
  ReplayPolicy?: { [key: string]: any };
  RawMessageDelivery?: Value<boolean>;
  Endpoint?: Value<string>;
  FilterPolicy?: { [key: string]: any };
  TopicArn: Value<string>;
  RedrivePolicy?: { [key: string]: any };
  DeliveryPolicy?: { [key: string]: any };
  Region?: Value<string>;
  SubscriptionRoleArn?: Value<string>;
  FilterPolicyScope?: Value<string>;
  Protocol: Value<string>;
}
export default class Subscription extends ResourceBase<SubscriptionProperties> {
  constructor(properties: SubscriptionProperties) {
    super('AWS::SNS::Subscription', properties);
  }
}
