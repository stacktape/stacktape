import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface StackFleetAssociationProperties {
  FleetName: Value<string>;
  StackName: Value<string>;
}
export default class StackFleetAssociation extends ResourceBase<StackFleetAssociationProperties> {
  constructor(properties: StackFleetAssociationProperties) {
    super('AWS::AppStream::StackFleetAssociation', properties);
  }
}
