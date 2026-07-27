import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface WebACLAssociationProperties {
  ResourceArn: Value<string>;
  WebACLArn: Value<string>;
}
export default class WebACLAssociation extends ResourceBase<WebACLAssociationProperties> {
  constructor(properties: WebACLAssociationProperties) {
    super('AWS::WAFv2::WebACLAssociation', properties);
  }
}
