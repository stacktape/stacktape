import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FilterPortRange {
  FromPort?: Value<number>;
  ToPort?: Value<number>;
  constructor(properties: FilterPortRange) {
    Object.assign(this, properties);
  }
}

export class PathFilter {
  SourceAddress?: Value<string>;
  DestinationPortRange?: FilterPortRange;
  SourcePortRange?: FilterPortRange;
  DestinationAddress?: Value<string>;
  constructor(properties: PathFilter) {
    Object.assign(this, properties);
  }
}
export interface NetworkInsightsPathProperties {
  Destination?: Value<string>;
  DestinationIp?: Value<string>;
  SourceIp?: Value<string>;
  FilterAtDestination?: PathFilter;
  FilterAtSource?: PathFilter;
  Protocol: Value<string>;
  DestinationPort?: Value<number>;
  Source: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class NetworkInsightsPath extends ResourceBase<NetworkInsightsPathProperties> {
  static FilterPortRange = FilterPortRange;
  static PathFilter = PathFilter;
  constructor(properties: NetworkInsightsPathProperties) {
    super('AWS::EC2::NetworkInsightsPath', properties);
  }
}
