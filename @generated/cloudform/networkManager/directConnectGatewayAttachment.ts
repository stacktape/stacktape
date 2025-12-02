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
export interface DirectConnectGatewayAttachmentProperties {
  ProposedSegmentChange?: ProposedSegmentChange;
  CoreNetworkId: Value<string>;
  ProposedNetworkFunctionGroupChange?: ProposedNetworkFunctionGroupChange;
  EdgeLocations: List<Value<string>>;
  DirectConnectGatewayArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DirectConnectGatewayAttachment extends ResourceBase<DirectConnectGatewayAttachmentProperties> {
  static ProposedNetworkFunctionGroupChange = ProposedNetworkFunctionGroupChange;
  static ProposedSegmentChange = ProposedSegmentChange;
  constructor(properties: DirectConnectGatewayAttachmentProperties) {
    super('AWS::NetworkManager::DirectConnectGatewayAttachment', properties);
  }
}
