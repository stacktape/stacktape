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

export class VpcOptions {
  Ipv6Support?: Value<boolean>;
  ApplianceModeSupport?: Value<boolean>;
  SecurityGroupReferencingSupport?: Value<boolean>;
  DnsSupport?: Value<boolean>;
  constructor(properties: VpcOptions) {
    Object.assign(this, properties);
  }
}
export interface VpcAttachmentProperties {
  ProposedSegmentChange?: ProposedSegmentChange;
  SubnetArns: List<Value<string>>;
  Options?: VpcOptions;
  CoreNetworkId: Value<string>;
  ProposedNetworkFunctionGroupChange?: ProposedNetworkFunctionGroupChange;
  VpcArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VpcAttachment extends ResourceBase<VpcAttachmentProperties> {
  static ProposedNetworkFunctionGroupChange = ProposedNetworkFunctionGroupChange;
  static ProposedSegmentChange = ProposedSegmentChange;
  static VpcOptions = VpcOptions;
  constructor(properties: VpcAttachmentProperties) {
    super('AWS::NetworkManager::VpcAttachment', properties);
  }
}
