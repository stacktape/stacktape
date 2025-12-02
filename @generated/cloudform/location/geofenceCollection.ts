import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface GeofenceCollectionProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  CollectionName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class GeofenceCollection extends ResourceBase<GeofenceCollectionProperties> {
  constructor(properties: GeofenceCollectionProperties) {
    super('AWS::Location::GeofenceCollection', properties);
  }
}
