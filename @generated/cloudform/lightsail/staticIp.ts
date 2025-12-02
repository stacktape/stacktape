import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface StaticIpProperties {
  StaticIpName: Value<string>;
  AttachedTo?: Value<string>;
}
export default class StaticIp extends ResourceBase<StaticIpProperties> {
  constructor(properties: StaticIpProperties) {
    super('AWS::Lightsail::StaticIp', properties);
  }
}
