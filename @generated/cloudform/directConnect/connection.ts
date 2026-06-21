import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ConnectionProperties {
  ConnectionName: Value<string>;
  LagId?: Value<string>;
  ProviderName?: Value<string>;
  RequestMACSec?: Value<boolean>;
  Bandwidth: Value<string>;
  Tags?: List<ResourceTag>;
  Location: Value<string>;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  constructor(properties: ConnectionProperties) {
    super('AWS::DirectConnect::Connection', properties);
  }
}
