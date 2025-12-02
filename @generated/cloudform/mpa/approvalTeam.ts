import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApprovalStrategy {
  MofN!: MofNApprovalStrategy;
  constructor(properties: ApprovalStrategy) {
    Object.assign(this, properties);
  }
}

export class Approver {
  PrimaryIdentityStatus?: Value<string>;
  PrimaryIdentitySourceArn!: Value<string>;
  ApproverId?: Value<string>;
  PrimaryIdentityId!: Value<string>;
  ResponseTime?: Value<string>;
  constructor(properties: Approver) {
    Object.assign(this, properties);
  }
}

export class MofNApprovalStrategy {
  MinApprovalsRequired!: Value<number>;
  constructor(properties: MofNApprovalStrategy) {
    Object.assign(this, properties);
  }
}

export class Policy {
  PolicyArn!: Value<string>;
  constructor(properties: Policy) {
    Object.assign(this, properties);
  }
}
export interface ApprovalTeamProperties {
  ApprovalStrategy: ApprovalStrategy;
  Policies: List<Policy>;
  Description: Value<string>;
  Approvers: List<Approver>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ApprovalTeam extends ResourceBase<ApprovalTeamProperties> {
  static ApprovalStrategy = ApprovalStrategy;
  static Approver = Approver;
  static MofNApprovalStrategy = MofNApprovalStrategy;
  static Policy = Policy;
  constructor(properties: ApprovalTeamProperties) {
    super('AWS::MPA::ApprovalTeam', properties);
  }
}
