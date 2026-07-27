// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-datalakesettings.json

/** Resource Type definition for AWS::LakeFormation::DataLakeSettings */
export type AwsLakeformationDatalakesettings = {
  AllowExternalDataFiltering?: boolean;
  ExternalDataFilteringAllowList?: Record<string, unknown>;
  CreateTableDefaultPermissions?: Record<string, unknown>;
  MutationType?: string;
  Parameters?: Record<string, unknown>;
  ReadOnlyAdmins?: Record<string, unknown>;
  AllowFullTableExternalDataAccess?: boolean;
  Admins?: Record<string, unknown>;
  CreateDatabaseDefaultPermissions?: Record<string, unknown>;
  Id?: string;
  /** @uniqueItems false */
  AuthorizedSessionTagValueList?: string[];
  /** @uniqueItems false */
  TrustedResourceOwners?: string[];
};
