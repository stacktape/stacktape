import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AddToProjectMemberPoolPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: AddToProjectMemberPoolPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateAssetTypePolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateAssetTypePolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateDomainUnitPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateDomainUnitPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateEnvironmentProfilePolicyGrantDetail {
  DomainUnitId?: Value<string>;
  constructor(properties: CreateEnvironmentProfilePolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateFormTypePolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateFormTypePolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateGlossaryPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateGlossaryPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateProjectFromProjectProfilePolicyGrantDetail {
  ProjectProfiles?: List<Value<string>>;
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateProjectFromProjectProfilePolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class CreateProjectPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: CreateProjectPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class DomainUnitFilterForProject {
  DomainUnit!: Value<string>;
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: DomainUnitFilterForProject) {
    Object.assign(this, properties);
  }
}

export class DomainUnitGrantFilter {
  AllDomainUnitsGrantFilter!: { [key: string]: any };
  constructor(properties: DomainUnitGrantFilter) {
    Object.assign(this, properties);
  }
}

export class DomainUnitPolicyGrantPrincipal {
  DomainUnitGrantFilter?: DomainUnitGrantFilter;
  DomainUnitDesignation?: Value<string>;
  DomainUnitIdentifier?: Value<string>;
  constructor(properties: DomainUnitPolicyGrantPrincipal) {
    Object.assign(this, properties);
  }
}

export class GroupPolicyGrantPrincipal {
  GroupIdentifier!: Value<string>;
  constructor(properties: GroupPolicyGrantPrincipal) {
    Object.assign(this, properties);
  }
}

export class OverrideDomainUnitOwnersPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: OverrideDomainUnitOwnersPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class OverrideProjectOwnersPolicyGrantDetail {
  IncludeChildDomainUnits?: Value<boolean>;
  constructor(properties: OverrideProjectOwnersPolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class PolicyGrantDetail {
  CreateEnvironmentFromBlueprint?: { [key: string]: any };
  CreateGlossary?: CreateGlossaryPolicyGrantDetail;
  CreateAssetType?: CreateAssetTypePolicyGrantDetail;
  CreateDomainUnit?: CreateDomainUnitPolicyGrantDetail;
  CreateProject?: CreateProjectPolicyGrantDetail;
  OverrideProjectOwners?: OverrideProjectOwnersPolicyGrantDetail;
  AddToProjectMemberPool?: AddToProjectMemberPoolPolicyGrantDetail;
  DelegateCreateEnvironmentProfile?: { [key: string]: any };
  CreateProjectFromProjectProfile?: CreateProjectFromProjectProfilePolicyGrantDetail;
  CreateEnvironment?: { [key: string]: any };
  CreateEnvironmentProfile?: CreateEnvironmentProfilePolicyGrantDetail;
  CreateFormType?: CreateFormTypePolicyGrantDetail;
  OverrideDomainUnitOwners?: OverrideDomainUnitOwnersPolicyGrantDetail;
  constructor(properties: PolicyGrantDetail) {
    Object.assign(this, properties);
  }
}

export class PolicyGrantPrincipal {
  Group?: GroupPolicyGrantPrincipal;
  Project?: ProjectPolicyGrantPrincipal;
  User?: UserPolicyGrantPrincipal;
  DomainUnit?: DomainUnitPolicyGrantPrincipal;
  constructor(properties: PolicyGrantPrincipal) {
    Object.assign(this, properties);
  }
}

export class ProjectGrantFilter {
  DomainUnitFilter!: DomainUnitFilterForProject;
  constructor(properties: ProjectGrantFilter) {
    Object.assign(this, properties);
  }
}

export class ProjectPolicyGrantPrincipal {
  ProjectIdentifier?: Value<string>;
  ProjectDesignation?: Value<string>;
  ProjectGrantFilter?: ProjectGrantFilter;
  constructor(properties: ProjectPolicyGrantPrincipal) {
    Object.assign(this, properties);
  }
}

export class UserPolicyGrantPrincipal {
  AllUsersGrantFilter?: { [key: string]: any };
  UserIdentifier?: Value<string>;
  constructor(properties: UserPolicyGrantPrincipal) {
    Object.assign(this, properties);
  }
}
export interface PolicyGrantProperties {
  EntityType: Value<string>;
  PolicyType: Value<string>;
  EntityIdentifier: Value<string>;
  Detail?: PolicyGrantDetail;
  Principal?: PolicyGrantPrincipal;
  DomainIdentifier: Value<string>;
}
export default class PolicyGrant extends ResourceBase<PolicyGrantProperties> {
  static AddToProjectMemberPoolPolicyGrantDetail = AddToProjectMemberPoolPolicyGrantDetail;
  static CreateAssetTypePolicyGrantDetail = CreateAssetTypePolicyGrantDetail;
  static CreateDomainUnitPolicyGrantDetail = CreateDomainUnitPolicyGrantDetail;
  static CreateEnvironmentProfilePolicyGrantDetail = CreateEnvironmentProfilePolicyGrantDetail;
  static CreateFormTypePolicyGrantDetail = CreateFormTypePolicyGrantDetail;
  static CreateGlossaryPolicyGrantDetail = CreateGlossaryPolicyGrantDetail;
  static CreateProjectFromProjectProfilePolicyGrantDetail = CreateProjectFromProjectProfilePolicyGrantDetail;
  static CreateProjectPolicyGrantDetail = CreateProjectPolicyGrantDetail;
  static DomainUnitFilterForProject = DomainUnitFilterForProject;
  static DomainUnitGrantFilter = DomainUnitGrantFilter;
  static DomainUnitPolicyGrantPrincipal = DomainUnitPolicyGrantPrincipal;
  static GroupPolicyGrantPrincipal = GroupPolicyGrantPrincipal;
  static OverrideDomainUnitOwnersPolicyGrantDetail = OverrideDomainUnitOwnersPolicyGrantDetail;
  static OverrideProjectOwnersPolicyGrantDetail = OverrideProjectOwnersPolicyGrantDetail;
  static PolicyGrantDetail = PolicyGrantDetail;
  static PolicyGrantPrincipal = PolicyGrantPrincipal;
  static ProjectGrantFilter = ProjectGrantFilter;
  static ProjectPolicyGrantPrincipal = ProjectPolicyGrantPrincipal;
  static UserPolicyGrantPrincipal = UserPolicyGrantPrincipal;
  constructor(properties: PolicyGrantProperties) {
    super('AWS::DataZone::PolicyGrant', properties);
  }
}
