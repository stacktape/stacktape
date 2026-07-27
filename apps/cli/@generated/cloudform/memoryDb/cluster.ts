import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Endpoint {
  Address?: Value<string>;
  Port?: Value<number>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  NumReplicasPerShard?: Value<number>;
  Description?: Value<string>;
  FinalSnapshotName?: Value<string>;
  ParameterGroupName?: Value<string>;
  SnapshotArns?: List<Value<string>>;
  Port?: Value<number>;
  ACLName: Value<string>;
  SnapshotName?: Value<string>;
  NumShards?: Value<number>;
  TLSEnabled?: Value<boolean>;
  NetworkType?: Value<string>;
  ClusterName: Value<string>;
  SnsTopicArn?: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
  MultiRegionClusterName?: Value<string>;
  EngineVersion?: Value<string>;
  KmsKeyId?: Value<string>;
  SnsTopicStatus?: Value<string>;
  SubnetGroupName?: Value<string>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  SecurityGroupIds?: List<Value<string>>;
  ClusterEndpoint?: Endpoint;
  SnapshotWindow?: Value<string>;
  SnapshotRetentionLimit?: Value<number>;
  DataTiering?: Value<string>;
  NodeType: Value<string>;
  IpDiscovery?: Value<string>;
  MaintenanceWindow?: Value<string>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static Endpoint = Endpoint;
  constructor(properties: ClusterProperties) {
    super('AWS::MemoryDB::Cluster', properties);
  }
}
