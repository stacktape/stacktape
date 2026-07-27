import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MultiRegionClusterProperties {
  MultiRegionParameterGroupName?: Value<string>;
  Description?: Value<string>;
  EngineVersion?: Value<string>;
  MultiRegionClusterNameSuffix?: Value<string>;
  TLSEnabled?: Value<boolean>;
  NodeType: Value<string>;
  UpdateStrategy?: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
  NumShards?: Value<number>;
}
export default class MultiRegionCluster extends ResourceBase<MultiRegionClusterProperties> {
  constructor(properties: MultiRegionClusterProperties) {
    super('AWS::MemoryDB::MultiRegionCluster', properties);
  }
}
