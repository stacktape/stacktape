import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface UserPoolUICustomizationAttachmentProperties {
  CSS?: Value<string>;
  UserPoolId: Value<string>;
  ClientId: Value<string>;
}
export default class UserPoolUICustomizationAttachment extends ResourceBase<UserPoolUICustomizationAttachmentProperties> {
  constructor(properties: UserPoolUICustomizationAttachmentProperties) {
    super('AWS::Cognito::UserPoolUICustomizationAttachment', properties);
  }
}
