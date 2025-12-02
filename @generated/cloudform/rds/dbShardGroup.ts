import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DBShardGroupProperties {
  DBClusterIdentifier: Value<string>;
  ComputeRedundancy?: Value<number>;
  DBShardGroupIdentifier?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  MaxACU: Value<number>;
  MinACU?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class DBShardGroup extends ResourceBase<DBShardGroupProperties> {
  constructor(properties: DBShardGroupProperties) {
    super('AWS::RDS::DBShardGroup', properties);
  }
}
