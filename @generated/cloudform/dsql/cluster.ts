import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionDetails {
  EncryptionType?: Value<string>;
  EncryptionStatus?: Value<string>;
  KmsKeyArn?: Value<string>;
  constructor(properties: EncryptionDetails) {
    Object.assign(this, properties);
  }
}

export class MultiRegionProperties {
  Clusters?: List<Value<string>>;
  WitnessRegion?: Value<string>;
  constructor(properties: MultiRegionProperties) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  KmsEncryptionKey?: Value<string>;
  DeletionProtectionEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  MultiRegionProperties?: MultiRegionProperties;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static EncryptionDetails = EncryptionDetails;
  static MultiRegionProperties = MultiRegionProperties;
  constructor(properties?: ClusterProperties) {
    super('AWS::DSQL::Cluster', properties || {});
  }
}
