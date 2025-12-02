import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Attributes {
  InboundCalls!: Value<boolean>;
  EnhancedContactMonitoring?: Value<boolean>;
  EnhancedChatMonitoring?: Value<boolean>;
  UseCustomTTSVoices?: Value<boolean>;
  OutboundCalls!: Value<boolean>;
  EarlyMedia?: Value<boolean>;
  MultiPartyConference?: Value<boolean>;
  ContactflowLogs?: Value<boolean>;
  ContactLens?: Value<boolean>;
  AutoResolveBestVoices?: Value<boolean>;
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
