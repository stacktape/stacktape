// This file is auto-generated. Do not edit manually.
// Source: aws-bcmdataexports-export.json

/** Definition of AWS::BCMDataExports::Export Resource Type */
export type AwsBcmdataexportsExport = {
  Export: {
    /**
     * @minLength 20
     * @maxLength 2048
     * @pattern ^arn:aws[-a-z0-9]*:(bcm-data-exports):[-a-z0-9]*:[0-9]{12}:[-a-zA-Z0-9/:_]+$
     */
    ExportArn?: string;
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[0-9A-Za-z\-_]+$
     */
    Name: string;
    /**
     * @minLength 0
     * @maxLength 1024
     * @pattern ^[\S\s]*$
     */
    Description?: string;
    DataQuery: {
      /**
       * @minLength 1
       * @maxLength 36000
       * @pattern ^[\S\s]*$
       */
      QueryStatement: string;
      TableConfigurations?: Record<string, Record<string, string>>;
    };
    DestinationConfigurations: {
      S3Destination: {
        /**
         * @minLength 0
         * @maxLength 1024
         * @pattern ^[\S\s]*$
         */
        S3Bucket: string;
        /**
         * @minLength 0
         * @maxLength 1024
         * @pattern ^[\S\s]*$
         */
        S3Prefix: string;
        /**
         * @minLength 0
         * @maxLength 1024
         * @pattern ^[\S\s]*$
         */
        S3Region: string;
        S3OutputConfigurations: {
          OutputType: "CUSTOM";
          Format: "TEXT_OR_CSV" | "PARQUET";
          Compression: "GZIP" | "PARQUET";
          Overwrite: "CREATE_NEW_REPORT" | "OVERWRITE_REPORT";
        };
      };
    };
    RefreshCadence: {
      Frequency: "SYNCHRONOUS";
    };
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z0-9]*:(bcm-data-exports):[-a-z0-9]*:[0-9]{12}:[-a-zA-Z0-9/:_]+$
   */
  ExportArn?: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
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
