import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EgressEndpoint {
  PackagingConfigurationId!: Value<string>;
  Url!: Value<string>;
  constructor(properties: EgressEndpoint) {
    Object.assign(this, properties);
  }
}
export interface AssetProperties {
  SourceArn: Value<string>;
  ResourceId?: Value<string>;
  Id: Value<string>;
  PackagingGroupId: Value<string>;
  EgressEndpoints?: List<EgressEndpoint>;
  Tags?: List<ResourceTag>;
  SourceRoleArn: Value<string>;
}
export default class Asset extends ResourceBase<AssetProperties> {
  static EgressEndpoint = EgressEndpoint;
  constructor(properties: AssetProperties) {
    super('AWS::MediaPackage::Asset', properties);
  }
}
