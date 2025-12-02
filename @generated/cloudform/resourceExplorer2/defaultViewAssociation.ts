import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DefaultViewAssociationProperties {
  ViewArn: Value<string>;
}
export default class DefaultViewAssociation extends ResourceBase<DefaultViewAssociationProperties> {
  constructor(properties: DefaultViewAssociationProperties) {
    super('AWS::ResourceExplorer2::DefaultViewAssociation', properties);
  }
}
