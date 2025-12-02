// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-projectmembership.json

/** Definition of AWS::DataZone::ProjectMembership Resource Type */
export type AwsDatazoneProjectmembership = {
  Designation: "PROJECT_OWNER" | "PROJECT_CONTRIBUTOR" | "PROJECT_CATALOG_VIEWER" | "PROJECT_CATALOG_CONSUMER" | "PROJECT_CATALOG_STEWARD";
  /** @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$ */
  DomainIdentifier: string;
  Member: {
    UserIdentifier: string;
  } | {
    GroupIdentifier: string;
  };
  MemberIdentifier?: string;
  MemberIdentifierType?: "USER_IDENTIFIER" | "GROUP_IDENTIFIER";
  /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
  ProjectIdentifier: string;
};
