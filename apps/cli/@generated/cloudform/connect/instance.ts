import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Attributes {
  EnhancedContactMonitoring?: Value<boolean>;
  OutboundCalls!: Value<boolean>;
  EarlyMedia?: Value<boolean>;
  MessageStreaming?: Value<boolean>;
  MultiPartyConference?: Value<boolean>;
  ContactLens?: Value<boolean>;
  AutoResolveBestVoices?: Value<boolean>;
  InboundCalls!: Value<boolean>;
  EnhancedChatMonitoring?: Value<boolean>;
  UseCustomTTSVoices?: Value<boolean>;
  ContactflowLogs?: Value<boolean>;
  MultiPartyChatConference?: Value<boolean>;
  HighVolumeOutBound?: Value<boolean>;
  constructor(properties: Attributes) {
    Object.assign(this, properties);
  }
}
export interface InstanceProperties {
  DirectoryId?: Value<string>;
  IdentityManagementType: Value<string>;
  InstanceAlias?: Value<string>;
  Attributes: Attributes;
  Tags?: List<ResourceTag>;
}
export default class Instance extends ResourceBase<InstanceProperties> {
  static Attributes = Attributes;
  constructor(properties: InstanceProperties) {
    super('AWS::Connect::Instance', properties);
  }
}
