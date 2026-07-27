import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCGatewayAttachmentProperties {
  InternetGatewayId?: Value<string>;
  VpcId: Value<string>;
  VpnGatewayId?: Value<string>;
}
export default class VPCGatewayAttachment extends ResourceBase<VPCGatewayAttachmentProperties> {
  constructor(properties: VPCGatewayAttachmentProperties) {
    super('AWS::EC2::VPCGatewayAttachment', properties);
  }
}
