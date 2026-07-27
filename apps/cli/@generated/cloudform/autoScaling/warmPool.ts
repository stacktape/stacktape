import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class InstanceReusePolicy {
  ReuseOnScaleIn?: Value<boolean>;
  constructor(properties: InstanceReusePolicy) {
    Object.assign(this, properties);
  }
}
export interface WarmPoolProperties {
  MinSize?: Value<number>;
  MaxGroupPreparedCapacity?: Value<number>;
  AutoScalingGroupName: Value<string>;
  PoolState?: Value<string>;
  InstanceReusePolicy?: InstanceReusePolicy;
}
export default class WarmPool extends ResourceBase<WarmPoolProperties> {
  static InstanceReusePolicy = InstanceReusePolicy;
  constructor(properties: WarmPoolProperties) {
    super('AWS::AutoScaling::WarmPool', properties);
  }
}
