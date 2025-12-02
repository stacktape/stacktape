import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface OrganizationalUnitAssociationProperties {
  OrganizationalUnitId: Value<string>;
  NotificationConfigurationArn: Value<string>;
}
export default class OrganizationalUnitAssociation extends ResourceBase<OrganizationalUnitAssociationProperties> {
  constructor(properties: OrganizationalUnitAssociationProperties) {
    super('AWS::Notifications::OrganizationalUnitAssociation', properties);
  }
}
