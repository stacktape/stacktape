// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-policygrant.json

/**
 * Policy Grant in AWS DataZone is an explicit authorization assignment that allows a specific
 * principal (user, group, or project) to perform particular actions (such as creating glossary terms,
 * managing projects, or accessing resources) on governed resources within a certain scope (like a
 * Domain Unit or Project). Policy Grants are essentially the mechanism by which DataZone enforces
 * fine-grained, role-based access control beyond what is possible through AWS IAM alone.
 */
export type AwsDatazonePolicygrant = {
  Detail?: {
    CreateDomainUnit: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    OverrideDomainUnitOwners: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    AddToProjectMemberPool: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    OverrideProjectOwners: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    CreateGlossary: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    CreateFormType: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    CreateAssetType: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    CreateProject: {
      IncludeChildDomainUnits?: boolean;
    };
  } | {
    CreateEnvironmentProfile: {
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^[a-z0-9_\-]+$
       */
      DomainUnitId?: string;
    };
  } | {
    DelegateCreateEnvironmentProfile: Record<string, unknown>;
  } | {
    CreateEnvironment: Record<string, unknown>;
  } | {
    CreateEnvironmentFromBlueprint: Record<string, unknown>;
  } | {
    CreateProjectFromProjectProfile: {
      IncludeChildDomainUnits?: boolean;
      ProjectProfiles?: string[];
    };
  };
  /** @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$ */
  DomainIdentifier: string;
  EntityIdentifier: string;
  EntityType: "DOMAIN_UNIT" | "ENVIRONMENT_BLUEPRINT_CONFIGURATION" | "ENVIRONMENT_PROFILE" | "ASSET_TYPE";
  /**
   * The unique identifier of the policy grant returned by the AddPolicyGrant API
   * @pattern ^[A-Za-z0-9+/]{10}$
   */
  GrantId?: string;
  /** Specifies the timestamp at which policy grant member was created. */
  CreatedAt?: string;
  /** Specifies the user who created the policy grant member. */
  CreatedBy?: string;
  PolicyType: "CREATE_DOMAIN_UNIT" | "OVERRIDE_DOMAIN_UNIT_OWNERS" | "ADD_TO_PROJECT_MEMBER_POOL" | "OVERRIDE_PROJECT_OWNERS" | "CREATE_GLOSSARY" | "CREATE_FORM_TYPE" | "CREATE_ASSET_TYPE" | "CREATE_PROJECT" | "CREATE_ENVIRONMENT_PROFILE" | "DELEGATE_CREATE_ENVIRONMENT_PROFILE" | "CREATE_ENVIRONMENT" | "CREATE_ENVIRONMENT_FROM_BLUEPRINT" | "CREATE_PROJECT_FROM_PROJECT_PROFILE";
  Principal?: {
    User: {
      /** @pattern (^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$|^[a-zA-Z_0-9+=,.@-]+$|^arn:aws[^:]*:iam::\d{12}:.+$) */
      UserIdentifier: string;
    } | {
      AllUsersGrantFilter: Record<string, unknown>;
    };
  } | {
    Group: {
      /** @pattern (^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$|[\p{L}\p{M}\p{S}\p{N}\p{P}\t\n\r  ]+) */
      GroupIdentifier: string;
    };
  } | {
    Project: {
      ProjectDesignation?: "OWNER" | "CONTRIBUTOR" | "PROJECT_CATALOG_STEWARD";
      /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
      ProjectIdentifier?: string;
      ProjectGrantFilter?: {
        DomainUnitFilter: {
          /**
           * @minLength 1
           * @maxLength 256
           * @pattern ^[a-z0-9_\-]+$
           */
          DomainUnit: string;
          /** @default false */
          IncludeChildDomainUnits?: boolean;
        };
      };
    };
  } | {
    DomainUnit: {
      DomainUnitDesignation?: "OWNER";
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^[a-z0-9_\-]+$
       */
      DomainUnitIdentifier?: string;
      DomainUnitGrantFilter?: {
        AllDomainUnitsGrantFilter: Record<string, unknown>;
      };
    };
  };
};
