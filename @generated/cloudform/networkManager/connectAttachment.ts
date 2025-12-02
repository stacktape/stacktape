import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectAttachmentOptions {
  Protocol?: Value<string>;
  constructor(properties: ConnectAttachmentOptions) {
    Object.assign(this, properties);
  }
}

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
export interface ConnectAttachmentProperties {
  ProposedSegmentChange?: ProposedSegmentChange;
  Options: ConnectAttachmentOptions;
  TransportAttachmentId: Value<string>;
  CoreNetworkId: Value<string>;
  ProposedNetworkFunctionGroupChange?: ProposedNetworkFunctionGroupChange;
  NetworkFunctionGroupName?: Value<string>;
  Tags?: List<ResourceTag>;
  EdgeLocation: Value<string>;
}
export default class ConnectAttachment extends ResourceBase<ConnectAttachmentProperties> {
  static ConnectAttachmentOptions = ConnectAttachmentOptions;
  static ProposedNetworkFunctionGroupChange = ProposedNetworkFunctionGroupChange;
  static ProposedSegmentChange = ProposedSegmentChange;
  constructor(properties: ConnectAttachmentProperties) {
    super('AWS::NetworkManager::ConnectAttachment', properties);
  }
}
