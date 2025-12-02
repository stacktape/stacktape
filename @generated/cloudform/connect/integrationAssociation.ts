import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface IntegrationAssociationProperties {
  IntegrationArn: Value<string>;
  InstanceId: Value<string>;
  IntegrationType: Value<string>;
}
export default class IntegrationAssociation extends ResourceBase<IntegrationAssociationProperties> {
  constructor(properties: IntegrationAssociationProperties) {
    super('AWS::Connect::IntegrationAssociation', properties);
  }
}
