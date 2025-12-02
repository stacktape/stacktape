import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class IamUserProfileDetails {
  Arn?: Value<string>;
  constructor(properties: IamUserProfileDetails) {
    Object.assign(this, properties);
  }
}

export class SsoUserProfileDetails {
  Username?: Value<string>;
  FirstName?: Value<string>;
  LastName?: Value<string>;
  constructor(properties: SsoUserProfileDetails) {
    Object.assign(this, properties);
  }
}

export class UserProfileDetails {
  Iam?: IamUserProfileDetails;
  Sso?: SsoUserProfileDetails;
  constructor(properties: UserProfileDetails) {
    Object.assign(this, properties);
  }
}
export interface UserProfileProperties {
  Status?: Value<string>;
  UserIdentifier: Value<string>;
  UserType?: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class UserProfile extends ResourceBase<UserProfileProperties> {
  static IamUserProfileDetails = IamUserProfileDetails;
  static SsoUserProfileDetails = SsoUserProfileDetails;
  static UserProfileDetails = UserProfileDetails;
  constructor(properties: UserProfileProperties) {
    super('AWS::DataZone::UserProfile', properties);
  }
}
