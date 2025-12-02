import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityProviderStrategy {
  CapacityProvider!: Value<string>;
  Base?: Value<number>;
  Weight?: Value<number>;
  constructor(properties: CapacityProviderStrategy) {
    Object.assign(this, properties);
  }
}
export interface ClusterCapacityProviderAssociationsProperties {
  DefaultCapacityProviderStrategy: List<CapacityProviderStrategy>;
  CapacityProviders?: List<Value<string>>;
  Cluster: Value<string>;
}
export default class ClusterCapacityProviderAssociations extends ResourceBase<ClusterCapacityProviderAssociationsProperties> {
  static CapacityProviderStrategy = CapacityProviderStrategy;
  constructor(properties: ClusterCapacityProviderAssociationsProperties) {
    super('AWS::ECS::ClusterCapacityProviderAssociations', properties);
  }
}
