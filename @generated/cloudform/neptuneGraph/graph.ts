import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class VectorSearchConfiguration {
  VectorSearchDimension!: Value<number>;
  constructor(properties: VectorSearchConfiguration) {
    Object.assign(this, properties);
  }
}
export interface GraphProperties {
  PublicConnectivity?: Value<boolean>;
  GraphName?: Value<string>;
  ReplicaCount?: Value<number>;
  ProvisionedMemory: Value<number>;
  DeletionProtection?: Value<boolean>;
  VectorSearchConfiguration?: VectorSearchConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Graph extends ResourceBase<GraphProperties> {
  static VectorSearchConfiguration = VectorSearchConfiguration;
  constructor(properties: GraphProperties) {
    super('AWS::NeptuneGraph::Graph', properties);
  }
}
