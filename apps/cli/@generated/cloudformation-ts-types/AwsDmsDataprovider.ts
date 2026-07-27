// This file is auto-generated. Do not edit manually.
// Source: aws-dms-dataprovider.json

/** Resource schema for AWS::DMS::DataProvider */
export type AwsDmsDataprovider = {
  /**
   * The property describes a name to identify the data provider.
   * @minLength 1
   * @maxLength 255
   */
  DataProviderName?: string;
  /**
   * The property describes an identifier for the data provider. It is used for
   * describing/deleting/modifying can be name/arn
   * @minLength 1
   * @maxLength 255
   */
  DataProviderIdentifier?: string;
  /**
   * The data provider ARN.
   * @minLength 1
   * @maxLength 255
   */
  DataProviderArn?: string;
  /**
   * The data provider creation time.
   * @minLength 1
   * @maxLength 40
   */
  DataProviderCreationTime?: string;
  /**
   * The optional description of the data provider.
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
  /**
   * The property describes a data engine for the data provider.
   * @enum ["aurora","aurora_postgresql","mysql","oracle","postgres","sqlserver","redshift","mariadb","mongodb","docdb","db2","db2_zos"]
   */
  Engine: "aurora" | "aurora_postgresql" | "mysql" | "oracle" | "postgres" | "sqlserver" | "redshift" | "mariadb" | "mongodb" | "docdb" | "db2" | "db2_zos";
  /**
   * The property describes the exact settings which can be modified
   * @default false
   */
  ExactSettings?: boolean;
  /** The property identifies the exact type of settings for the data provider. */
  Settings?: unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
