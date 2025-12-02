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
export interface SiteToSiteVpnAttachmentProperties {
  ProposedSegmentChange?: ProposedSegmentChange;
  CoreNetworkId: Value<string>;
  ProposedNetworkFunctionGroupChange?: ProposedNetworkFunctionGroupChange;
  VpnConnectionArn: Value<string>;
  NetworkFunctionGroupName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SiteToSiteVpnAttachment extends ResourceBase<SiteToSiteVpnAttachmentProperties> {
  static ProposedNetworkFunctionGroupChange = ProposedNetworkFunctionGroupChange;
  static ProposedSegmentChange = ProposedSegmentChange;
  constructor(properties: SiteToSiteVpnAttachmentProperties) {
    super('AWS::NetworkManager::SiteToSiteVpnAttachment', properties);
  }
}
