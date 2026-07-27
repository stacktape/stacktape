import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ChannelAssociationProperties {
  NotificationConfigurationArn: Value<string>;
  Arn: Value<string>;
}
export default class ChannelAssociation extends ResourceBase<ChannelAssociationProperties> {
  constructor(properties: ChannelAssociationProperties) {
    super('AWS::Notifications::ChannelAssociation', properties);
  }
}
