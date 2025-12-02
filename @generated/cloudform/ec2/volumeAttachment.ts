import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VolumeAttachmentProperties {
  VolumeId: Value<string>;
  InstanceId: Value<string>;
  Device?: Value<string>;
}
export default class VolumeAttachment extends ResourceBase<VolumeAttachmentProperties> {
  constructor(properties: VolumeAttachmentProperties) {
    super('AWS::EC2::VolumeAttachment', properties);
  }
}
