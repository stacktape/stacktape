import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DataCatalogProperties {
  Status?: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  Parameters?: { [key: string]: Value<string> };
  ConnectionType?: Value<string>;
  Error?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DataCatalog extends ResourceBase<DataCatalogProperties> {
  constructor(properties: DataCatalogProperties) {
    super('AWS::Athena::DataCatalog', properties);
  }
}
