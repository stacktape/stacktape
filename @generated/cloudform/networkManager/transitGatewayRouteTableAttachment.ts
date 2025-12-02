import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ProposedNetworkFunctionGroupChange {
  Tags?: List<ResourceTag>;
  NetworkFunctionGroupName?: Value<string>;
  AttachmentPolicyRuleNumber?: Value<number>;
  constructor(properties: ProposedNetworkFunctionGroupChange) {
    Object.assign(this, properties);
  }
}

export class ProposedSegmentChange {
  SegmentName?: Value<string>;
  Tags?: List<ResourceTag>;
  AttachmentPolicyRuleNumber?: Value<number>;
  constructor(properties: ProposedSegmentChange) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayRouteTableAttachmentProperties {
  ProposedSegmentChange?: ProposedSegmentChange;
  TransitGatewayRouteTableArn: Value<string>;
  ProposedNetworkFunctionGroupChange?: ProposedNetworkFunctionGroupChange;
  PeeringId: Value<string>;
  NetworkFunctionGroupName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayRouteTableAttachment extends ResourceBase<TransitGatewayRouteTableAttachmentProperties> {
  static ProposedNetworkFunctionGroupChange = ProposedNetworkFunctionGroupChange;
  static ProposedSegmentChange = ProposedSegmentChange;
  constructor(properties: TransitGatewayRouteTableAttachmentProperties) {
    super('AWS::NetworkManager::TransitGatewayRouteTableAttachment', properties);
  }
}
