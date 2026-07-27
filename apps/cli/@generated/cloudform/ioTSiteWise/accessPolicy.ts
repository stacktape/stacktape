import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessPolicyIdentity {
  User?: User;
  IamUser?: IamUser;
  IamRole?: IamRole;
  constructor(properties: AccessPolicyIdentity) {
    Object.assign(this, properties);
  }
}

export class AccessPolicyResource {
  Project?: Project;
  Portal?: Portal;
  constructor(properties: AccessPolicyResource) {
    Object.assign(this, properties);
  }
}

export class IamRole {
  arn?: Value<string>;
  constructor(properties: IamRole) {
    Object.assign(this, properties);
  }
}

export class IamUser {
  arn?: Value<string>;
  constructor(properties: IamUser) {
    Object.assign(this, properties);
  }
}

export class Portal {
  id?: Value<string>;
  constructor(properties: Portal) {
    Object.assign(this, properties);
  }
}

export class Project {
  id?: Value<string>;
  constructor(properties: Project) {
    Object.assign(this, properties);
  }
}

export class User {
  id?: Value<string>;
  constructor(properties: User) {
    Object.assign(this, properties);
  }
}
export interface AccessPolicyProperties {
  AccessPolicyResource: AccessPolicyResource;
  AccessPolicyIdentity: AccessPolicyIdentity;
  AccessPolicyPermission: Value<string>;
}
export default class AccessPolicy extends ResourceBase<AccessPolicyProperties> {
  static AccessPolicyIdentity = AccessPolicyIdentity;
  static AccessPolicyResource = AccessPolicyResource;
  static IamRole = IamRole;
  static IamUser = IamUser;
  static Portal = Portal;
  static Project = Project;
  static User = User;
  constructor(properties: AccessPolicyProperties) {
    super('AWS::IoTSiteWise::AccessPolicy', properties);
  }
}
