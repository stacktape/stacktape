import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ManagedNotificationAdditionalChannelAssociationProperties {
  ChannelArn: Value<string>;
  ManagedNotificationConfigurationArn: Value<string>;
}
export default class ManagedNotificationAdditionalChannelAssociation extends ResourceBase<ManagedNotificationAdditionalChannelAssociationProperties> {
  constructor(properties: ManagedNotificationAdditionalChannelAssociationProperties) {
    super('AWS::Notifications::ManagedNotificationAdditionalChannelAssociation', properties);
  }
}
