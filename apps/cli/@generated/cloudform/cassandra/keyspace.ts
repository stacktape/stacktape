import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ReplicationSpecification {
  ReplicationStrategy?: Value<string>;
  RegionList?: List<Value<string>>;
  constructor(properties: ReplicationSpecification) {
    Object.assign(this, properties);
  }
}
export interface KeyspaceProperties {
  ClientSideTimestampsEnabled?: Value<boolean>;
  KeyspaceName?: Value<string>;
  ReplicationSpecification?: ReplicationSpecification;
  Tags?: List<ResourceTag>;
}
export default class Keyspace extends ResourceBase<KeyspaceProperties> {
  static ReplicationSpecification = ReplicationSpecification;
  constructor(properties?: KeyspaceProperties) {
    super('AWS::Cassandra::Keyspace', properties || {});
  }
}
