import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DedicatedIpPoolProperties {
  PoolName?: Value<string>;
  ScalingMode?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DedicatedIpPool extends ResourceBase<DedicatedIpPoolProperties> {
  constructor(properties?: DedicatedIpPoolProperties) {
    super('AWS::SES::DedicatedIpPool', properties || {});
  }
}
