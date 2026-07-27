import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class KinesisConfiguration {
  AggregationEnabled?: Value<boolean>;
  StreamArn?: Value<string>;
  constructor(properties: KinesisConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StreamProperties {
  InclusiveStartTime: Value<string>;
  StreamName: Value<string>;
  KinesisConfiguration: KinesisConfiguration;
  ExclusiveEndTime?: Value<string>;
  LedgerName: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Stream extends ResourceBase<StreamProperties> {
  static KinesisConfiguration = KinesisConfiguration;
  constructor(properties: StreamProperties) {
    super('AWS::QLDB::Stream', properties);
  }
}
