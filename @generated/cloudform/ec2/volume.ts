import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface VolumeProperties {
  MultiAttachEnabled?: Value<boolean>;
  KmsKeyId?: Value<string>;
  Encrypted?: Value<boolean>;
  Size?: Value<number>;
  AutoEnableIO?: Value<boolean>;
  OutpostArn?: Value<string>;
  AvailabilityZone?: Value<string>;
  Throughput?: Value<number>;
  Iops?: Value<number>;
  VolumeInitializationRate?: Value<number>;
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  Tags?: List<ResourceTag>;
  AvailabilityZoneId?: Value<string>;
  SourceVolumeId?: Value<string>;
}
export default class Volume extends ResourceBase<VolumeProperties> {
  constructor(properties?: VolumeProperties) {
    super('AWS::EC2::Volume', properties || {});
  }
}
