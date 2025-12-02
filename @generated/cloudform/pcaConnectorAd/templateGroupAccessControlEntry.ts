import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessRights {
  Enroll?: Value<string>;
  AutoEnroll?: Value<string>;
  constructor(properties: AccessRights) {
    Object.assign(this, properties);
  }
}
export interface TemplateGroupAccessControlEntryProperties {
  AccessRights: AccessRights;
  TemplateArn?: Value<string>;
  GroupDisplayName: Value<string>;
  GroupSecurityIdentifier?: Value<string>;
}
export default class TemplateGroupAccessControlEntry extends ResourceBase<TemplateGroupAccessControlEntryProperties> {
  static AccessRights = AccessRights;
  constructor(properties: TemplateGroupAccessControlEntryProperties) {
    super('AWS::PCAConnectorAD::TemplateGroupAccessControlEntry', properties);
  }
}
