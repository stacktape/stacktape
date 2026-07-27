// This file is auto-generated. Do not edit manually.
// Source: aws-glue-table.json

/** Resource Type definition for AWS::Glue::Table */
export type AwsGlueTable = {
  DatabaseName: string;
  TableInput: {
    Owner?: string;
    ViewOriginalText?: string;
    Description?: string;
    TableType?: string;
    Parameters?: Record<string, unknown>;
    ViewExpandedText?: string;
    StorageDescriptor?: {
      StoredAsSubDirectories?: boolean;
      Parameters?: Record<string, unknown>;
      /** @uniqueItems false */
      BucketColumns?: string[];
      NumberOfBuckets?: number;
      OutputFormat?: string;
      /** @uniqueItems false */
      Columns?: {
        Comment?: string;
        Type?: string;
        Name: string;
      }[];
      SerdeInfo?: {
        Parameters?: Record<string, unknown>;
        SerializationLibrary?: string;
        Name?: string;
      };
      /** @uniqueItems false */
      SortColumns?: {
        Column: string;
        SortOrder: number;
      }[];
      Compressed?: boolean;
      SchemaReference?: {
        SchemaId?: {
          RegistryName?: string;
          SchemaName?: string;
          SchemaArn?: string;
        };
        SchemaVersionId?: string;
        SchemaVersionNumber?: number;
      };
      SkewedInfo?: {
        /** @uniqueItems false */
        SkewedColumnValues?: string[];
        SkewedColumnValueLocationMaps?: Record<string, unknown>;
        /** @uniqueItems false */
        SkewedColumnNames?: string[];
      };
      InputFormat?: string;
      Location?: string;
    };
    TargetTable?: {
      DatabaseName?: string;
      Region?: string;
      CatalogId?: string;
      Name?: string;
    };
    /** @uniqueItems false */
    PartitionKeys?: {
      Comment?: string;
      Type?: string;
      Name: string;
    }[];
    Retention?: number;
    Name?: string;
  };
  OpenTableFormatInput?: {
    IcebergInput?: {
      MetadataOperation?: Record<string, unknown>;
      Version?: string;
    };
  };
  Id?: string;
  CatalogId: string;
};
