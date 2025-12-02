import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface UserPoolUserToGroupAttachmentProperties {
  GroupName: Value<string>;
  UserPoolId: Value<string>;
  Username: Value<string>;
}
export default class UserPoolUserToGroupAttachment extends ResourceBase<UserPoolUserToGroupAttachmentProperties> {
  constructor(properties: UserPoolUserToGroupAttachmentProperties) {
    super('AWS::Cognito::UserPoolUserToGroupAttachment', properties);
  }
}
