import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationOptions {
  PerHourPartition!: Value<boolean>;
  HiveCompatiblePartitions!: Value<boolean>;
  FileFormat!: Value<string>;
  constructor(properties: DestinationOptions) {
    Object.assign(this, properties);
  }
}
export interface FlowLogProperties {
  LogFormat?: Value<string>;
  ResourceId: Value<string>;
  MaxAggregationInterval?: Value<number>;
  DestinationOptions?: DestinationOptions;
  ResourceType: Value<string>;
  DeliverCrossAccountRole?: Value<string>;
  LogDestination?: Value<string>;
  LogGroupName?: Value<string>;
  DeliverLogsPermissionArn?: Value<string>;
  LogDestinationType?: Value<string>;
  Tags?: List<ResourceTag>;
  TrafficType?: Value<string>;
}
export default class FlowLog extends ResourceBase<FlowLogProperties> {
  static DestinationOptions = DestinationOptions;
  constructor(properties: FlowLogProperties) {
    super('AWS::EC2::FlowLog', properties);
  }
}
