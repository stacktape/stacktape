// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-principalpermissions.json

/**
 * The ``AWS::LakeFormation::PrincipalPermissions`` resource represents the permissions that a
 * principal has on a GLUDC resource (such as GLUlong databases or GLUlong tables). When you create a
 * ``PrincipalPermissions`` resource, the permissions are granted via the LFlong``GrantPermissions``
 * API operation. When you delete a ``PrincipalPermissions`` resource, the permissions on
 * principal-resource pair are revoked via the LFlong``RevokePermissions`` API operation.
 */
export type AwsLakeformationPrincipalpermissions = {
  /**
   * The identifier for the GLUDC. By default, the account ID. The GLUDC is the persistent metadata
   * store. It contains database definitions, table definitions, and other control information to manage
   * your Lake Formation environment.
   */
  Catalog?: string;
  /** The principal to be granted a permission. */
  Principal: {
    /** An identifier for the LFlong principal. */
    DataLakePrincipalIdentifier?: string;
  };
  /** The resource to be granted or revoked permissions. */
  Resource: {
    /**
     * The identifier for the Data Catalog. By default, the account ID. The Data Catalog is the persistent
     * metadata store. It contains database definitions, table definitions, and other control information
     * to manage your LFlong environment.
     */
    Catalog?: Record<string, unknown>;
    /**
     * The database for the resource. Unique to the Data Catalog. A database is a set of associated table
     * definitions organized into a logical group. You can Grant and Revoke database permissions to a
     * principal.
     */
    Database?: {
      /** The identifier for the Data Catalog. By default, it is the account ID of the caller. */
      CatalogId: string;
      /** The name of the database resource. Unique to the Data Catalog. */
      Name: string;
    };
    /**
     * The table for the resource. A table is a metadata definition that represents your data. You can
     * Grant and Revoke table privileges to a principal.
     */
    Table?: {
      /** The identifier for the Data Catalog. By default, it is the account ID of the caller. */
      CatalogId: string;
      /**
       * The name of the database for the table. Unique to a Data Catalog. A database is a set of associated
       * table definitions organized into a logical group. You can Grant and Revoke database privileges to a
       * principal.
       */
      DatabaseName: string;
      /** The name of the table. */
      Name?: string;
      /**
       * A wildcard object representing every table under a database.
       * At least one of ``TableResource$Name`` or ``TableResource$TableWildcard`` is required.
       */
      TableWildcard?: Record<string, unknown>;
    };
    /**
     * The table with columns for the resource. A principal with permissions to this resource can select
     * metadata from the columns of a table in the Data Catalog and the underlying data in Amazon S3.
     */
    TableWithColumns?: {
      /** The identifier for the GLUDC where the location is registered with LFlong. */
      CatalogId: string;
      /**
       * The name of the database for the table with columns resource. Unique to the Data Catalog. A
       * database is a set of associated table definitions organized into a logical group. You can Grant and
       * Revoke database privileges to a principal.
       */
      DatabaseName: string;
      /**
       * The name of the table resource. A table is a metadata definition that represents your data. You can
       * Grant and Revoke table privileges to a principal.
       */
      Name: string;
      /**
       * The list of column names for the table. At least one of ``ColumnNames`` or ``ColumnWildcard`` is
       * required.
       */
      ColumnNames?: string[];
      /**
       * A wildcard specified by a ``ColumnWildcard`` object. At least one of ``ColumnNames`` or
       * ``ColumnWildcard`` is required.
       */
      ColumnWildcard?: {
        /** Excludes column names. Any column with this name will be excluded. */
        ExcludedColumnNames?: string[];
      };
    };
    /** The location of an Amazon S3 path where permissions are granted or revoked. */
    DataLocation?: {
      /** The identifier for the GLUDC where the location is registered with LFlong. */
      CatalogId: string;
      /** The Amazon Resource Name (ARN) that uniquely identifies the data location resource. */
      ResourceArn: string;
    };
    /** A data cell filter. */
    DataCellsFilter?: {
      /** The ID of the catalog to which the table belongs. */
      TableCatalogId: string;
      /** A database in the GLUDC. */
      DatabaseName: string;
      /** The name of the table. */
      TableName: string;
      /** The name given by the user to the data filter cell. */
      Name: string;
    };
    /** The LF-tag key and values attached to a resource. */
    LFTag?: {
      /** The identifier for the GLUDC where the location is registered with GLUDC. */
      CatalogId: string;
      /** The key-name for the LF-tag. */
      TagKey: string;
      /** A list of possible values for the corresponding ``TagKey`` of an LF-tag key-value pair. */
      TagValues: string[];
    };
    /** A list of LF-tag conditions that define a resource's LF-tag policy. */
    LFTagPolicy?: {
      /**
       * The identifier for the GLUDC. The GLUDC is the persistent metadata store. It contains database
       * definitions, table definitions, and other control information to manage your LFlong environment.
       */
      CatalogId: string;
      /** The resource type for which the LF-tag policy applies. */
      ResourceType: "DATABASE" | "TABLE";
      /** A list of LF-tag conditions that apply to the resource's LF-tag policy. */
      Expression: {
        /** The key-name for the LF-tag. */
        TagKey?: string;
        /** A list of possible values of the corresponding ``TagKey`` of an LF-tag key-value pair. */
        TagValues?: string[];
      }[];
    };
  };
  /** The permissions granted or revoked. */
  Permissions: ("ALL" | "SELECT" | "ALTER" | "DROP" | "DELETE" | "INSERT" | "DESCRIBE" | "CREATE_DATABASE" | "CREATE_TABLE" | "DATA_LOCATION_ACCESS" | "CREATE_LF_TAG" | "ASSOCIATE" | "GRANT_WITH_LF_TAG_EXPRESSION")[];
  /** Indicates the ability to grant permissions (as a subset of permissions granted). */
  PermissionsWithGrantOption: ("ALL" | "SELECT" | "ALTER" | "DROP" | "DELETE" | "INSERT" | "DESCRIBE" | "CREATE_DATABASE" | "CREATE_TABLE" | "DATA_LOCATION_ACCESS" | "CREATE_LF_TAG" | "ASSOCIATE" | "GRANT_WITH_LF_TAG_EXPRESSION")[];
  PrincipalIdentifier?: string;
  ResourceIdentifier?: string;
};
