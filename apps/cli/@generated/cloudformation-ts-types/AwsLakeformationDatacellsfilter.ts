// This file is auto-generated. Do not edit manually.
// Source: aws-lakeformation-datacellsfilter.json

/** A resource schema representing a Lake Formation Data Cells Filter. */
export type AwsLakeformationDatacellsfilter = {
  /** The Catalog Id of the Table on which to create a Data Cells Filter. */
  TableCatalogId: string;
  /** The name of the Database that the Table resides in. */
  DatabaseName: string;
  /** The name of the Table to create a Data Cells Filter for. */
  TableName: string;
  /** The desired name of the Data Cells Filter. */
  Name: string;
  /**
   * An object representing the Data Cells Filter's Row Filter. Either a Filter Expression or a Wildcard
   * is required
   */
  RowFilter?: {
    /** A PartiQL predicate. */
    FilterExpression?: string;
    /** An empty object representing a row wildcard. */
    AllRowsWildcard?: Record<string, unknown>;
  };
  /** A list of columns to be included in this Data Cells Filter. */
  ColumnNames?: string[];
  /**
   * An object representing the Data Cells Filter's Columns. Either Column Names or a Wildcard is
   * required
   */
  ColumnWildcard?: {
    /** A list of column names to be excluded from the Data Cells Filter. */
    ExcludedColumnNames?: string[];
  };
};
