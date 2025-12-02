import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class GlobalEndpoint {
  Address?: Value<string>;
  constructor(properties: GlobalEndpoint) {
    Object.assign(this, properties);
  }
}
export interface GlobalClusterProperties {
  EngineLifecycleSupport?: Value<string>;
  StorageEncrypted?: Value<boolean>;
  EngineVersion?: Value<string>;
  SourceDBClusterIdentifier?: Value<string>;
  DeletionProtection?: Value<boolean>;
  GlobalClusterIdentifier?: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class GlobalCluster extends ResourceBase<GlobalClusterProperties> {
  static GlobalEndpoint = GlobalEndpoint;
  constructor(properties?: GlobalClusterProperties) {
    super('AWS::RDS::GlobalCluster', properties || {});
  }
}
