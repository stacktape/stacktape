import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class StreamEncryption {
  EncryptionType!: Value<string>;
  KeyId!: Value<string>;
  constructor(properties: StreamEncryption) {
    Object.assign(this, properties);
  }
}

export class StreamModeDetails {
  StreamMode!: Value<string>;
  constructor(properties: StreamModeDetails) {
    Object.assign(this, properties);
  }
}
export interface StreamProperties {
  StreamModeDetails?: StreamModeDetails;
  StreamEncryption?: StreamEncryption;
  RetentionPeriodHours?: Value<number>;
  DesiredShardLevelMetrics?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  ShardCount?: Value<number>;
  MaxRecordSizeInKiB?: Value<number>;
}
export default class Stream extends ResourceBase<StreamProperties> {
  static StreamEncryption = StreamEncryption;
  static StreamModeDetails = StreamModeDetails;
  constructor(properties?: StreamProperties) {
    super('AWS::Kinesis::Stream', properties || {});
  }
}
