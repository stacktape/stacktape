// This file is auto-generated. Do not edit manually.
// Source: aws-forecast-dataset.json

/** Resource Type Definition for AWS::Forecast::Dataset */
export type AwsForecastDataset = {
  /**
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9\-\_\.\/\:]+$
   */
  Arn?: string;
  /**
   * A name for the dataset
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z][a-zA-Z0-9_]*
   */
  DatasetName: string;
  /**
   * The dataset type
   * @enum ["TARGET_TIME_SERIES","RELATED_TIME_SERIES","ITEM_METADATA"]
   */
  DatasetType: "TARGET_TIME_SERIES" | "RELATED_TIME_SERIES" | "ITEM_METADATA";
  /**
   * Frequency of data collection. This parameter is required for RELATED_TIME_SERIES
   * @pattern ^Y|M|W|D|H|30min|15min|10min|5min|1min$
   */
  DataFrequency?: string;
  /**
   * The domain associated with the dataset
   * @enum ["RETAIL","CUSTOM","INVENTORY_PLANNING","EC2_CAPACITY","WORK_FORCE","WEB_TRAFFIC","METRICS"]
   */
  Domain: "RETAIL" | "CUSTOM" | "INVENTORY_PLANNING" | "EC2_CAPACITY" | "WORK_FORCE" | "WEB_TRAFFIC" | "METRICS";
  EncryptionConfig?: {
    KmsKeyArn?: string;
    RoleArn?: string;
  };
  Schema: {
    Attributes?: ({
      /**
       * Name of the dataset field
       * @pattern ^[a-zA-Z][a-zA-Z0-9_]*
       */
      AttributeName?: string;
      /**
       * Data type of the field
       * @enum ["string","integer","float","timestamp","geolocation"]
       */
      AttributeType?: "string" | "integer" | "float" | "timestamp" | "geolocation";
    })[];
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
