import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface NotificationConfigurationProperties {
  Description: Value<string>;
  AggregationDuration?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class NotificationConfiguration extends ResourceBase<NotificationConfigurationProperties> {
  constructor(properties: NotificationConfigurationProperties) {
    super('AWS::Notifications::NotificationConfiguration', properties);
  }
}
