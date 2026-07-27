// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-dataset.json

/** Resource schema for AWS::DataBrew::Dataset. */
export type AwsDatabrewDataset = {
  /**
   * Dataset name
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * Dataset format
   * @enum ["CSV","JSON","PARQUET","EXCEL","ORC"]
   */
  Format?: "CSV" | "JSON" | "PARQUET" | "EXCEL" | "ORC";
  /** Format options for dataset */
  FormatOptions?: {
    Json?: {
      MultiLine?: boolean;
    };
    Excel?: unknown | unknown;
    Csv?: {
      /**
       * @minLength 1
       * @maxLength 1
       */
      Delimiter?: string;
      HeaderRow?: boolean;
    };
  };
  /** Input */
  Input: {
    S3InputDefinition?: {
      Bucket: string;
      Key?: string;
      BucketOwner?: string;
    };
    DataCatalogInputDefinition?: {
      /** Catalog id */
      CatalogId?: string;
      /** Database name */
      DatabaseName?: string;
      /** Table name */
      TableName?: string;
      TempDirectory?: {
        Bucket: string;
        Key?: string;
        BucketOwner?: string;
      };
    };
    DatabaseInputDefinition?: {
      /** Glue connection name */
      GlueConnectionName: string;
      /** Database table name */
      DatabaseTableName?: string;
      TempDirectory?: {
        Bucket: string;
        Key?: string;
        BucketOwner?: string;
      };
      /**
       * Custom SQL to run against the provided AWS Glue connection. This SQL will be used as the input for
       * DataBrew projects and jobs.
       */
      QueryString?: string;
    };
    Metadata?: {
      /** Arn of the source of the dataset. For e.g.: AppFlow Flow ARN. */
      SourceArn?: string;
    };
  };
  /**
   * Source type of the dataset
   * @enum ["S3","DATA-CATALOG","DATABASE"]
   */
  Source?: "S3" | "DATA-CATALOG" | "DATABASE";
  /** PathOptions */
  PathOptions?: {
    FilesLimit?: {
      /** Maximum number of files */
      MaxFiles: number;
      /**
       * Ordered by
       * @enum ["LAST_MODIFIED_DATE"]
       */
      OrderedBy?: "LAST_MODIFIED_DATE";
      /**
       * Order
       * @enum ["ASCENDING","DESCENDING"]
       */
      Order?: "ASCENDING" | "DESCENDING";
    };
    LastModifiedDateCondition?: {
      /**
       * Filtering expression for a parameter
       * @minLength 4
       * @maxLength 1024
       * @pattern ^[><0-9A-Za-z_.,:)(!= ]+$
       */
      Expression: string;
      ValuesMap: {
        /**
         * Variable name
         * @minLength 2
         * @maxLength 128
         * @pattern ^:[A-Za-z0-9_]+$
         */
        ValueReference: string;
        /**
         * @minLength 0
         * @maxLength 1024
         */
        Value: string;
      }[];
    };
    Parameters?: ({
      PathParameterName: string;
      DatasetParameter: {
        Name: string;
        /**
         * Parameter type
         * @enum ["String","Number","Datetime"]
         */
        Type: "String" | "Number" | "Datetime";
        DatetimeOptions?: {
          /**
           * Date/time format of a date parameter
           * @minLength 2
           * @maxLength 100
           */
          Format: string;
          /**
           * Timezone offset
           * @minLength 1
           * @maxLength 6
           * @pattern ^(Z|[-+](\d|\d{2}|\d{2}:?\d{2}))$
           */
          TimezoneOffset?: string;
          /**
           * Locale code for a date parameter
           * @minLength 2
           * @maxLength 100
           * @pattern ^[A-Za-z0-9_\.#@\-]+$
           */
          LocaleCode?: string;
        };
        /** Add the value of this parameter as a column in a dataset. */
        CreateColumn?: boolean;
        Filter?: {
          /**
           * Filtering expression for a parameter
           * @minLength 4
           * @maxLength 1024
           * @pattern ^[><0-9A-Za-z_.,:)(!= ]+$
           */
          Expression: string;
          ValuesMap: {
            /**
             * Variable name
             * @minLength 2
             * @maxLength 128
             * @pattern ^:[A-Za-z0-9_]+$
             */
            ValueReference: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value: string;
          }[];
        };
      };
    })[];
  };
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
