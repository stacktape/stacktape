import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionAliasAssociation {
  AssociatedAccountId?: Value<string>;
  ResourceId?: Value<string>;
  ConnectionIdentifier?: Value<string>;
  AssociationStatus?: Value<string>;
  constructor(properties: ConnectionAliasAssociation) {
    Object.assign(this, properties);
  }
}
export interface ConnectionAliasProperties {
  ConnectionString: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ConnectionAlias extends ResourceBase<ConnectionAliasProperties> {
  static ConnectionAliasAssociation = ConnectionAliasAssociation;
  constructor(properties: ConnectionAliasProperties) {
    super('AWS::WorkSpaces::ConnectionAlias', properties);
  }
}
