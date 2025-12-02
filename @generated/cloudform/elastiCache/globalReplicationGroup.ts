import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class GlobalReplicationGroupMember {
  Role?: Value<string>;
  ReplicationGroupRegion?: Value<string>;
  ReplicationGroupId?: Value<string>;
  constructor(properties: GlobalReplicationGroupMember) {
    Object.assign(this, properties);
  }
}

export class RegionalConfiguration {
  ReplicationGroupRegion?: Value<string>;
  ReplicationGroupId?: Value<string>;
  ReshardingConfigurations?: List<ReshardingConfiguration>;
  constructor(properties: RegionalConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReshardingConfiguration {
  NodeGroupId?: Value<string>;
  PreferredAvailabilityZones?: List<Value<string>>;
  constructor(properties: ReshardingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface GlobalReplicationGroupProperties {
  GlobalReplicationGroupIdSuffix?: Value<string>;
  CacheNodeType?: Value<string>;
  EngineVersion?: Value<string>;
  GlobalReplicationGroupDescription?: Value<string>;
  RegionalConfigurations?: List<RegionalConfiguration>;
  CacheParameterGroupName?: Value<string>;
  Engine?: Value<string>;
  Members: List<GlobalReplicationGroupMember>;
  AutomaticFailoverEnabled?: Value<boolean>;
  GlobalNodeGroupCount?: Value<number>;
}
export default class GlobalReplicationGroup extends ResourceBase<GlobalReplicationGroupProperties> {
  static GlobalReplicationGroupMember = GlobalReplicationGroupMember;
  static RegionalConfiguration = RegionalConfiguration;
  static ReshardingConfiguration = ReshardingConfiguration;
  constructor(properties: GlobalReplicationGroupProperties) {
    super('AWS::ElastiCache::GlobalReplicationGroup', properties);
  }
}
