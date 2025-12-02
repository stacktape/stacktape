import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProfilePermissionProperties {
  Action: Value<string>;
  StatementId: Value<string>;
  ProfileName: Value<string>;
  Principal: Value<string>;
  ProfileVersion?: Value<string>;
}
export default class ProfilePermission extends ResourceBase<ProfilePermissionProperties> {
  constructor(properties: ProfilePermissionProperties) {
    super('AWS::Signer::ProfilePermission', properties);
  }
}
