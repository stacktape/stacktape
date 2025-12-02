import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface StackUserAssociationProperties {
  SendEmailNotification?: Value<boolean>;
  UserName: Value<string>;
  StackName: Value<string>;
  AuthenticationType: Value<string>;
}
export default class StackUserAssociation extends ResourceBase<StackUserAssociationProperties> {
  constructor(properties: StackUserAssociationProperties) {
    super('AWS::AppStream::StackUserAssociation', properties);
  }
}
