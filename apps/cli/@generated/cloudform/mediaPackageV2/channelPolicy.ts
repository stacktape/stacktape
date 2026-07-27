import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ChannelPolicyProperties {
  Policy: { [key: string]: any };
  ChannelName: Value<string>;
  ChannelGroupName: Value<string>;
}
export default class ChannelPolicy extends ResourceBase<ChannelPolicyProperties> {
  constructor(properties: ChannelPolicyProperties) {
    super('AWS::MediaPackageV2::ChannelPolicy', properties);
  }
}
