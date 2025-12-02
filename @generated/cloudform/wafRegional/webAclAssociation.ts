import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface WebACLAssociationProperties {
  ResourceArn: Value<string>;
  WebACLId: Value<string>;
}
export default class WebACLAssociation extends ResourceBase<WebACLAssociationProperties> {
  constructor(properties: WebACLAssociationProperties) {
    super('AWS::WAFRegional::WebACLAssociation', properties);
  }
}
