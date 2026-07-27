import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SSESpecification {
  SSEEnabled?: Value<boolean>;
  constructor(properties: SSESpecification) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  SSESpecification?: SSESpecification;
  Description?: Value<string>;
  ReplicationFactor: Value<number>;
  ParameterGroupName?: Value<string>;
  AvailabilityZones?: List<Value<string>>;
  IAMRoleARN: Value<string>;
  SubnetGroupName?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  ClusterEndpointEncryptionType?: Value<string>;
  NotificationTopicARN?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  NetworkType?: Value<string>;
  NodeType: Value<string>;
  ClusterName?: Value<string>;
  Tags?: { [key: string]: any };
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static SSESpecification = SSESpecification;
  constructor(properties: ClusterProperties) {
    super('AWS::DAX::Cluster', properties);
  }
}
