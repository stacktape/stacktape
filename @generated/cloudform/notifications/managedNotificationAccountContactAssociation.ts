import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ManagedNotificationAccountContactAssociationProperties {
  ContactIdentifier: Value<string>;
  ManagedNotificationConfigurationArn: Value<string>;
}
export default class ManagedNotificationAccountContactAssociation extends ResourceBase<ManagedNotificationAccountContactAssociationProperties> {
  constructor(properties: ManagedNotificationAccountContactAssociationProperties) {
    super('AWS::Notifications::ManagedNotificationAccountContactAssociation', properties);
  }
}
