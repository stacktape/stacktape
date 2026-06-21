import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class StreamStorageConfiguration {
  DefaultStorageTier?: Value<string>;
  constructor(properties: StreamStorageConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StreamProperties {
  StreamStorageConfiguration?: StreamStorageConfiguration;
  KmsKeyId?: Value<string>;
  MediaType?: Value<string>;
  DataRetentionInHours?: Value<number>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  DeviceName?: Value<string>;
}
export default class Stream extends ResourceBase<StreamProperties> {
  static StreamStorageConfiguration = StreamStorageConfiguration;
  constructor(properties?: StreamProperties) {
    super('AWS::KinesisVideo::Stream', properties || {});
  }
}
