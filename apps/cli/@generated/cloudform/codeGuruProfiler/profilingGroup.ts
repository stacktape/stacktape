import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentPermissions {
  Principals!: List<Value<string>>;
  constructor(properties: AgentPermissions) {
    Object.assign(this, properties);
  }
}

export class Channel {
  channelUri!: Value<string>;
  channelId?: Value<string>;
  constructor(properties: Channel) {
    Object.assign(this, properties);
  }
}
export interface ProfilingGroupProperties {
  AnomalyDetectionNotificationConfiguration?: List<Channel>;
  AgentPermissions?: AgentPermissions;
  ComputePlatform?: Value<string>;
  ProfilingGroupName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ProfilingGroup extends ResourceBase<ProfilingGroupProperties> {
  static AgentPermissions = AgentPermissions;
  static Channel = Channel;
  constructor(properties: ProfilingGroupProperties) {
    super('AWS::CodeGuruProfiler::ProfilingGroup', properties);
  }
}
