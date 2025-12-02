import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface OrganizationAdminProperties {
  AccountId: Value<string>;
}
export default class OrganizationAdmin extends ResourceBase<OrganizationAdminProperties> {
  constructor(properties: OrganizationAdminProperties) {
    super('AWS::Detective::OrganizationAdmin', properties);
  }
}
