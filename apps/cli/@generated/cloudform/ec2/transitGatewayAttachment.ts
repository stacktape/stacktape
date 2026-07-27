import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Options {
  Ipv6Support?: Value<string>;
  ApplianceModeSupport?: Value<string>;
  SecurityGroupReferencingSupport?: Value<string>;
  DnsSupport?: Value<string>;
  constructor(properties: Options) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayAttachmentProperties {
  Options?: Options;
  TransitGatewayId: Value<string>;
  VpcId: Value<string>;
  SubnetIds: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayAttachment extends ResourceBase<TransitGatewayAttachmentProperties> {
  static Options = Options;
  constructor(properties: TransitGatewayAttachmentProperties) {
    super('AWS::EC2::TransitGatewayAttachment', properties);
  }
}
