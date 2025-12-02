import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SnapshotInner {
  Status?: Value<string>;
  NamespaceName?: Value<string>;
  AdminUsername?: Value<string>;
  SnapshotCreateTime?: Value<string>;
  NamespaceArn?: Value<string>;
  KmsKeyId?: Value<string>;
  SnapshotArn?: Value<string>;
  OwnerAccount?: Value<string>;
  RetentionPeriod?: Value<number>;
  SnapshotName?: Value<string>;
  constructor(properties: SnapshotInner) {
    Object.assign(this, properties);
  }
}
export interface SnapshotProperties {
  NamespaceName?: Value<string>;
  RetentionPeriod?: Value<number>;
  SnapshotName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Snapshot extends ResourceBase<SnapshotProperties> {
  static Snapshot = SnapshotInner;
  constructor(properties: SnapshotProperties) {
    super('AWS::RedshiftServerless::Snapshot', properties);
  }
}
