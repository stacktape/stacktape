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
export interface TransitGatewayVpcAttachmentProperties {
  Options?: Options;
  TransitGatewayId: Value<string>;
  VpcId: Value<string>;
  RemoveSubnetIds?: List<Value<string>>;
  SubnetIds: List<Value<string>>;
  AddSubnetIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayVpcAttachment extends ResourceBase<TransitGatewayVpcAttachmentProperties> {
  static Options = Options;
  constructor(properties: TransitGatewayVpcAttachmentProperties) {
    super('AWS::EC2::TransitGatewayVpcAttachment', properties);
  }
}
