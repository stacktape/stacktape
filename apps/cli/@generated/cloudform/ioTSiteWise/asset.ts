import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AssetHierarchy {
  LogicalId?: Value<string>;
  ExternalId?: Value<string>;
  Id?: Value<string>;
  ChildAssetId!: Value<string>;
  constructor(properties: AssetHierarchy) {
    Object.assign(this, properties);
  }
}

export class AssetProperty {
  LogicalId?: Value<string>;
  Alias?: Value<string>;
  ExternalId?: Value<string>;
  Id?: Value<string>;
  Unit?: Value<string>;
  NotificationState?: Value<string>;
  constructor(properties: AssetProperty) {
    Object.assign(this, properties);
  }
}
export interface AssetProperties {
  AssetModelId: Value<string>;
  AssetDescription?: Value<string>;
  AssetProperties?: List<AssetProperty>;
  AssetExternalId?: Value<string>;
  AssetName: Value<string>;
  Tags?: List<ResourceTag>;
  AssetHierarchies?: List<AssetHierarchy>;
}
export default class Asset extends ResourceBase<AssetProperties> {
  static AssetHierarchy = AssetHierarchy;
  static AssetProperty = AssetProperty;
  constructor(properties: AssetProperties) {
    super('AWS::IoTSiteWise::Asset', properties);
  }
}
