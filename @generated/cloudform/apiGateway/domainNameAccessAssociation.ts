import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainNameAccessAssociationProperties {
  DomainNameArn: Value<string>;
  AccessAssociationSource: Value<string>;
  AccessAssociationSourceType: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DomainNameAccessAssociation extends ResourceBase<DomainNameAccessAssociationProperties> {
  constructor(properties: DomainNameAccessAssociationProperties) {
    super('AWS::ApiGateway::DomainNameAccessAssociation', properties);
  }
}
