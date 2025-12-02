import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MapConfiguration {
  PoliticalView?: Value<string>;
  Style!: Value<string>;
  CustomLayers?: List<Value<string>>;
  constructor(properties: MapConfiguration) {
    Object.assign(this, properties);
  }
}
export interface MapProperties {
  MapName: Value<string>;
  Description?: Value<string>;
  Configuration: MapConfiguration;
  PricingPlan?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Map extends ResourceBase<MapProperties> {
  static MapConfiguration = MapConfiguration;
  constructor(properties: MapProperties) {
    super('AWS::Location::Map', properties);
  }
}
