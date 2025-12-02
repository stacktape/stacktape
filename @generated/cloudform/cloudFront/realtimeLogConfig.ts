import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EndPoint {
  KinesisStreamConfig!: KinesisStreamConfig;
  StreamType!: Value<string>;
  constructor(properties: EndPoint) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamConfig {
  StreamArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: KinesisStreamConfig) {
    Object.assign(this, properties);
  }
}
export interface RealtimeLogConfigProperties {
  Fields: List<Value<string>>;
  EndPoints: List<EndPoint>;
  SamplingRate: Value<number>;
  Name: Value<string>;
}
export default class RealtimeLogConfig extends ResourceBase<RealtimeLogConfigProperties> {
  static EndPoint = EndPoint;
  static KinesisStreamConfig = KinesisStreamConfig;
  constructor(properties: RealtimeLogConfigProperties) {
    super('AWS::CloudFront::RealtimeLogConfig', properties);
  }
}
