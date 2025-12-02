import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Options {
  StaticSourcesSupport?: Value<string>;
  AutoAcceptSharedAssociations?: Value<string>;
  Igmpv2Support?: Value<string>;
  constructor(properties: Options) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayMulticastDomainProperties {
  Options?: Options;
  TransitGatewayId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayMulticastDomain extends ResourceBase<TransitGatewayMulticastDomainProperties> {
  static Options = Options;
  constructor(properties: TransitGatewayMulticastDomainProperties) {
    super('AWS::EC2::TransitGatewayMulticastDomain', properties);
  }
}
