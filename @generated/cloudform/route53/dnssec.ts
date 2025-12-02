import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DNSSECProperties {
  HostedZoneId: Value<string>;
}
export default class DNSSEC extends ResourceBase<DNSSECProperties> {
  constructor(properties: DNSSECProperties) {
    super('AWS::Route53::DNSSEC', properties);
  }
}
