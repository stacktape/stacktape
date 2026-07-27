import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DestinationProperties {
  DestinationPolicy?: Value<string>;
  DestinationName: Value<string>;
  TargetArn: Value<string>;
  Tags?: List<ResourceTag>;
  RoleArn: Value<string>;
}
export default class Destination extends ResourceBase<DestinationProperties> {
  constructor(properties: DestinationProperties) {
    super('AWS::Logs::Destination', properties);
  }
}
