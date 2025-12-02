import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AWSAccount {
  Id?: Value<string>;
  EmailAddress?: Value<string>;
  Name?: Value<string>;
  constructor(properties: AWSAccount) {
    Object.assign(this, properties);
  }
}

export class AWSService {
  ServiceName?: Value<string>;
  constructor(properties: AWSService) {
    Object.assign(this, properties);
  }
}

export class AssessmentReportsDestination {
  Destination?: Value<string>;
  DestinationType?: Value<string>;
  constructor(properties: AssessmentReportsDestination) {
    Object.assign(this, properties);
  }
}

export class Delegation {
  Status?: Value<string>;
  Comment?: Value<string>;
  CreatedBy?: Value<string>;
  RoleType?: Value<string>;
  AssessmentId?: Value<string>;
  CreationTime?: Value<number>;
  LastUpdated?: Value<number>;
  Id?: Value<string>;
  AssessmentName?: Value<string>;
  RoleArn?: Value<string>;
  ControlSetId?: Value<string>;
  constructor(properties: Delegation) {
    Object.assign(this, properties);
  }
}

export class Role {
  RoleType?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: Role) {
    Object.assign(this, properties);
  }
}

export class Scope {
  AwsAccounts?: List<AWSAccount>;
  AwsServices?: List<AWSService>;
  constructor(properties: Scope) {
    Object.assign(this, properties);
  }
}
export interface AssessmentProperties {
  Status?: Value<string>;
  AssessmentReportsDestination?: AssessmentReportsDestination;
  Delegations?: List<Delegation>;
  Description?: Value<string>;
  Scope?: Scope;
  AwsAccount?: AWSAccount;
  Roles?: List<Role>;
  FrameworkId?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Assessment extends ResourceBase<AssessmentProperties> {
  static AWSAccount = AWSAccount;
  static AWSService = AWSService;
  static AssessmentReportsDestination = AssessmentReportsDestination;
  static Delegation = Delegation;
  static Role = Role;
  static Scope = Scope;
  constructor(properties?: AssessmentProperties) {
    super('AWS::AuditManager::Assessment', properties || {});
  }
}
