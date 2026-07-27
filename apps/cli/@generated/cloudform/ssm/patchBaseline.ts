import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PatchFilter {
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: PatchFilter) {
    Object.assign(this, properties);
  }
}

export class PatchFilterGroup {
  PatchFilters?: List<PatchFilter>;
  constructor(properties: PatchFilterGroup) {
    Object.assign(this, properties);
  }
}

export class PatchSource {
  Products?: List<Value<string>>;
  Configuration?: Value<string>;
  Name?: Value<string>;
  constructor(properties: PatchSource) {
    Object.assign(this, properties);
  }
}

export class Rule {
  ApproveUntilDate?: Value<string>;
  EnableNonSecurity?: Value<boolean>;
  PatchFilterGroup?: PatchFilterGroup;
  ApproveAfterDays?: Value<number>;
  ComplianceLevel?: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class RuleGroup {
  PatchRules?: List<Rule>;
  constructor(properties: RuleGroup) {
    Object.assign(this, properties);
  }
}
export interface PatchBaselineProperties {
  OperatingSystem?: Value<string>;
  Description?: Value<string>;
  ApprovalRules?: RuleGroup;
  Sources?: List<PatchSource>;
  Name: Value<string>;
  RejectedPatches?: List<Value<string>>;
  ApprovedPatches?: List<Value<string>>;
  RejectedPatchesAction?: Value<string>;
  PatchGroups?: List<Value<string>>;
  ApprovedPatchesComplianceLevel?: Value<string>;
  AvailableSecurityUpdatesComplianceStatus?: Value<string>;
  ApprovedPatchesEnableNonSecurity?: Value<boolean>;
  DefaultBaseline?: Value<boolean>;
  GlobalFilters?: PatchFilterGroup;
  Tags?: List<ResourceTag>;
}
export default class PatchBaseline extends ResourceBase<PatchBaselineProperties> {
  static PatchFilter = PatchFilter;
  static PatchFilterGroup = PatchFilterGroup;
  static PatchSource = PatchSource;
  static Rule = Rule;
  static RuleGroup = RuleGroup;
  constructor(properties: PatchBaselineProperties) {
    super('AWS::SSM::PatchBaseline', properties);
  }
}
