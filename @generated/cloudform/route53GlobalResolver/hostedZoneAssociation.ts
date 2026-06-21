import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface HostedZoneAssociationProperties {
  ResourceArn: Value<string>;
  HostedZoneId: Value<string>;
  Name: Value<string>;
}
export default class HostedZoneAssociation extends ResourceBase<HostedZoneAssociationProperties> {
  constructor(properties: HostedZoneAssociationProperties) {
    super('AWS::Route53GlobalResolver::HostedZoneAssociation', properties);
  }
}
