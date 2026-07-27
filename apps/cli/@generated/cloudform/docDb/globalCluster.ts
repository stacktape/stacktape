import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface GlobalClusterProperties {
  StorageEncrypted?: Value<boolean>;
  EngineVersion?: Value<string>;
  SourceDBClusterIdentifier?: Value<string>;
  DeletionProtection?: Value<boolean>;
  GlobalClusterIdentifier: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class GlobalCluster extends ResourceBase<GlobalClusterProperties> {
  constructor(properties: GlobalClusterProperties) {
    super('AWS::DocDB::GlobalCluster', properties);
  }
}
