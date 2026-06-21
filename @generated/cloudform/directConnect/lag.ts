import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LagProperties {
  ProviderName?: Value<string>;
  RequestMACSec?: Value<boolean>;
  ConnectionsBandwidth: Value<string>;
  LagName: Value<string>;
  MinimumLinks?: Value<number>;
  Tags?: List<ResourceTag>;
  Location: Value<string>;
}
export default class Lag extends ResourceBase<LagProperties> {
  constructor(properties: LagProperties) {
    super('AWS::DirectConnect::Lag', properties);
  }
}
