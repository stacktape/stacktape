import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HttpUrlDestinationSummary {
  ConfirmationUrl?: Value<string>;
  constructor(properties: HttpUrlDestinationSummary) {
    Object.assign(this, properties);
  }
}

export class VpcDestinationProperties {
  SecurityGroups?: List<Value<string>>;
  VpcId?: Value<string>;
  SubnetIds?: List<Value<string>>;
  RoleArn?: Value<string>;
  constructor(properties: VpcDestinationProperties) {
    Object.assign(this, properties);
  }
}
export interface TopicRuleDestinationProperties {
  Status?: Value<string>;
  HttpUrlProperties?: HttpUrlDestinationSummary;
  VpcProperties?: VpcDestinationProperties;
}
export default class TopicRuleDestination extends ResourceBase<TopicRuleDestinationProperties> {
  static HttpUrlDestinationSummary = HttpUrlDestinationSummary;
  static VpcDestinationProperties = VpcDestinationProperties;
  constructor(properties?: TopicRuleDestinationProperties) {
    super('AWS::IoT::TopicRuleDestination', properties || {});
  }
}
