import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataSourceConfiguration {
  IntendedUse?: Value<string>;
  constructor(properties: DataSourceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface PlaceIndexProperties {
  IndexName: Value<string>;
  Description?: Value<string>;
  PricingPlan?: Value<string>;
  DataSourceConfiguration?: DataSourceConfiguration;
  Tags?: List<ResourceTag>;
  DataSource: Value<string>;
}
export default class PlaceIndex extends ResourceBase<PlaceIndexProperties> {
  static DataSourceConfiguration = DataSourceConfiguration;
  constructor(properties: PlaceIndexProperties) {
    super('AWS::Location::PlaceIndex', properties);
  }
}
