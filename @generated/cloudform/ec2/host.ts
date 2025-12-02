import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface HostProperties {
  HostRecovery?: Value<string>;
  InstanceFamily?: Value<string>;
  AutoPlacement?: Value<string>;
  OutpostArn?: Value<string>;
  HostMaintenance?: Value<string>;
  AvailabilityZone: Value<string>;
  InstanceType?: Value<string>;
  AssetId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Host extends ResourceBase<HostProperties> {
  constructor(properties: HostProperties) {
    super('AWS::EC2::Host', properties);
  }
}
