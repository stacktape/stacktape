// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-permissions.json

/** Resource Type definition for AWS::LakeFormation::Permissions */
export type AwsLakeformationPermissions = {
  Resource: {
    DatabaseResource?: {
      CatalogId?: string;
      Name?: string;
    };
    DataLocationResource?: {
      S3Resource?: string;
      CatalogId?: string;
    };
    TableWithColumnsResource?: {
      DatabaseName?: string;
      /** @uniqueItems false */
      ColumnNames?: string[];
      CatalogId?: string;
      Name?: string;
      ColumnWildcard?: {
        /** @uniqueItems false */
        ExcludedColumnNames?: string[];
      };
    };
    TableResource?: {
      DatabaseName?: string;
      CatalogId?: string;
      TableWildcard?: Record<string, unknown>;
      Name?: string;
    };
  };
  /** @uniqueItems false */
  Permissions?: string[];
  Id?: string;
  DataLakePrincipal: {
    DataLakePrincipalIdentifier?: string;
  };
  /** @uniqueItems false */
  PermissionsWithGrantOption?: string[];
};
