import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SubscriptionFilterProperties {
  FieldSelectionCriteria?: Value<string>;
  FilterPattern: Value<string>;
  EmitSystemFields?: List<Value<string>>;
  Distribution?: Value<string>;
  LogGroupName: Value<string>;
  ApplyOnTransformedLogs?: Value<boolean>;
  FilterName?: Value<string>;
  DestinationArn: Value<string>;
  RoleArn?: Value<string>;
}
export default class SubscriptionFilter extends ResourceBase<SubscriptionFilterProperties> {
  constructor(properties: SubscriptionFilterProperties) {
    super('AWS::Logs::SubscriptionFilter', properties);
  }
}
