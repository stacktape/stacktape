// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-tagassociation.json

/**
 * A resource schema representing a Lake Formation Tag Association. While tag associations are not
 * explicit Lake Formation resources, this CloudFormation resource can be used to associate tags with
 * Lake Formation entities.
 */
export type AwsLakeformationTagassociation = {
  /** Resource to tag with the Lake Formation Tags */
  Resource: {
    Catalog?: Record<string, unknown>;
    Database?: {
      CatalogId: string;
      Name: string;
    };
    Table?: {
      CatalogId: string;
      DatabaseName: string;
      Name?: string;
      TableWildcard?: Record<string, unknown>;
    };
    TableWithColumns?: {
      CatalogId: string;
      DatabaseName: string;
      Name: string;
      ColumnNames: string[];
    };
  };
  /** List of Lake Formation Tags to associate with the Lake Formation Resource */
  LFTags: {
    CatalogId: string;
    TagKey: string;
    TagValues: string[];
  }[];
  /**
   * Unique string identifying the resource. Used as primary identifier, which ideally should be a
   * string
   */
  ResourceIdentifier?: string;
  /**
   * Unique string identifying the resource's tags. Used as primary identifier, which ideally should be
   * a string
   */
  TagsIdentifier?: string;
};
