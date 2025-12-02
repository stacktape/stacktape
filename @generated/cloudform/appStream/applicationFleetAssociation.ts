import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ApplicationFleetAssociationProperties {
  FleetName: Value<string>;
  ApplicationArn: Value<string>;
}
export default class ApplicationFleetAssociation extends ResourceBase<ApplicationFleetAssociationProperties> {
  constructor(properties: ApplicationFleetAssociationProperties) {
    super('AWS::AppStream::ApplicationFleetAssociation', properties);
  }
}
