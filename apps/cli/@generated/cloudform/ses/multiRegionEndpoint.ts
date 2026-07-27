import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Details {
  RouteDetails!: List<RouteDetailsItems>;
  constructor(properties: Details) {
    Object.assign(this, properties);
  }
}

export class RouteDetailsItems {
  Region!: Value<string>;
  constructor(properties: RouteDetailsItems) {
    Object.assign(this, properties);
  }
}
export interface MultiRegionEndpointProperties {
  Details: Details;
  EndpointName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MultiRegionEndpoint extends ResourceBase<MultiRegionEndpointProperties> {
  static Details = Details;
  static RouteDetailsItems = RouteDetailsItems;
  constructor(properties: MultiRegionEndpointProperties) {
    super('AWS::SES::MultiRegionEndpoint', properties);
  }
}
