import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagSpecification {
  ResourceType?: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: TagSpecification) {
    Object.assign(this, properties);
  }
}
export interface VolumeProperties {
  SizeInGB?: Value<number>;
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  TagSpecifications?: List<TagSpecification>;
  Encrypted?: Value<boolean>;
  AvailabilityZone: Value<string>;
  Throughput?: Value<number>;
  Iops?: Value<number>;
}
export default class Volume extends ResourceBase<VolumeProperties> {
  static TagSpecification = TagSpecification;
  constructor(properties: VolumeProperties) {
    super('AWS::WorkspacesInstances::Volume', properties);
  }
}
