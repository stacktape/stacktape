// This file is auto-generated. Do not edit manually.
// Source: aws-glue-database.json

/** Resource Type definition for AWS::Glue::Database */
export type AwsGlueDatabase = {
  /** The AWS account ID for the account in which to create the catalog object. */
  CatalogId: string;
  /** The metadata for the database. */
  DatabaseInput: {
    /** The location of the database (for example, an HDFS path). */
    LocationUri?: string;
    /**
     * Creates a set of default permissions on the table for principals. Used by AWS Lake Formation. Not
     * used in the normal course of AWS Glue operations.
     * @uniqueItems false
     */
    CreateTableDefaultPermissions?: {
      /**
       * The permissions that are granted to the principal.
       * @uniqueItems false
       */
      Permissions?: string[];
      /** The principal who is granted permissions. */
      Principal?: {
        /** An identifier for the AWS Lake Formation principal. */
        DataLakePrincipalIdentifier?: string;
      };
    }[];
    /** A description of the database. */
    Description?: string;
    /** These key-value pairs define parameters and properties of the database. */
    Parameters?: Record<string, unknown>;
    /** A DatabaseIdentifier structure that describes a target database for resource linking. */
    TargetDatabase?: {
      /** The name of the catalog database. */
      DatabaseName?: string;
      /** Region of the target database. */
      Region?: string;
      /** The ID of the Data Catalog in which the database resides. */
      CatalogId?: string;
    };
    /** A FederatedDatabase structure that references an entity outside the AWS Glue Data Catalog. */
    FederatedDatabase?: {
      /** The name of the connection to the external metastore. */
      ConnectionName?: string;
      /** A unique identifier for the federated database. */
      Identifier?: string;
    };
    /** The name of the database. For hive compatibility, this is folded to lowercase when it is stored. */
    Name?: string;
  };
  /** The name of the database. For hive compatibility, this is folded to lowercase when it is store. */
  DatabaseName?: string;
};
