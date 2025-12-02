import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainNameApiAssociationProperties {
  DomainName: Value<string>;
  ApiId: Value<string>;
}
export default class DomainNameApiAssociation extends ResourceBase<DomainNameApiAssociationProperties> {
  constructor(properties: DomainNameApiAssociationProperties) {
    super('AWS::AppSync::DomainNameApiAssociation', properties);
  }
}
