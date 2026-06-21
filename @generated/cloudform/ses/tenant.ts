import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceAssociation {
  ResourceArn!: Value<string>;
  constructor(properties: ResourceAssociation) {
    Object.assign(this, properties);
  }
}
export interface TenantProperties {
  ResourceAssociations?: List<ResourceAssociation>;
  TenantName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Tenant extends ResourceBase<TenantProperties> {
  static ResourceAssociation = ResourceAssociation;
  constructor(properties: TenantProperties) {
    super('AWS::SES::Tenant', properties);
  }
}
