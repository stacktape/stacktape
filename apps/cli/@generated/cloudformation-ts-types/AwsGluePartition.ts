// This file is auto-generated. Do not edit manually.
// Source: aws-glue-partition.json

/** Resource Type definition for AWS::Glue::Partition */
export type AwsGluePartition = {
  DatabaseName: string;
  TableName: string;
  Id?: string;
  CatalogId: string;
  PartitionInput: {
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
        SortOrder?: number;
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
    /** @uniqueItems false */
    Values: string[];
    Parameters?: Record<string, unknown>;
  };
};
