import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityLimits {
  MaxSearchCapacityInOcu?: Value<number>;
  MinIndexingCapacityInOcu?: Value<number>;
  MaxIndexingCapacityInOcu?: Value<number>;
  MinSearchCapacityInOcu?: Value<number>;
  constructor(properties: CapacityLimits) {
    Object.assign(this, properties);
  }
}
export interface CollectionGroupProperties {
  Description?: Value<string>;
  StandbyReplicas: Value<string>;
  CapacityLimits?: CapacityLimits;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class CollectionGroup extends ResourceBase<CollectionGroupProperties> {
  static CapacityLimits = CapacityLimits;
  constructor(properties: CollectionGroupProperties) {
    super('AWS::OpenSearchServerless::CollectionGroup', properties);
  }
}
