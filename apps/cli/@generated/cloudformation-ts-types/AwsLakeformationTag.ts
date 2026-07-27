// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-tag.json

/** A resource schema representing a Lake Formation Tag. */
export type AwsLakeformationTag = {
  /**
   * The identifier for the Data Catalog. By default, the account ID. The Data Catalog is the persistent
   * metadata store. It contains database definitions, table definitions, and other control information
   * to manage your Lake Formation environment.
   */
  CatalogId?: string;
  /** The key-name for the LF-tag. */
  TagKey: string;
  /** A list of possible values an attribute can take. */
  TagValues: string[];
};
