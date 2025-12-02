import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RegionConfiguration {
  SseKmsKeyId!: Value<string>;
  constructor(properties: RegionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationRegion {
  RegionConfiguration?: RegionConfiguration;
  RegionName?: Value<string>;
  constructor(properties: ReplicationRegion) {
    Object.assign(this, properties);
  }
}
export interface ReplicationSetProperties {
  Regions: List<ReplicationRegion>;
  DeletionProtected?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class ReplicationSet extends ResourceBase<ReplicationSetProperties> {
  static RegionConfiguration = RegionConfiguration;
  static ReplicationRegion = ReplicationRegion;
  constructor(properties: ReplicationSetProperties) {
    super('AWS::SSMIncidents::ReplicationSet', properties);
  }
}
