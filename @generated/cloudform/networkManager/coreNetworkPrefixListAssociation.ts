import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface CoreNetworkPrefixListAssociationProperties {
  CoreNetworkId: Value<string>;
  PrefixListArn: Value<string>;
  PrefixListAlias: Value<string>;
}
export default class CoreNetworkPrefixListAssociation extends ResourceBase<CoreNetworkPrefixListAssociationProperties> {
  constructor(properties: CoreNetworkPrefixListAssociationProperties) {
    super('AWS::NetworkManager::CoreNetworkPrefixListAssociation', properties);
  }
}
