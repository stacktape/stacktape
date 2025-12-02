// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-dataset.json

/** Resource schema for AWS::IoTSiteWise::Dataset. */
export type AwsIotsitewiseDataset = {
  /**
   * The ID of the dataset.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  DatasetId?: string;
  /** The ARN of the dataset. */
  DatasetArn?: string;
  /** The name of the dataset. */
  DatasetName: string;
  /** A description about the dataset, and its functionality. */
  DatasetDescription?: string;
  /** The data source for the dataset. */
  DatasetSource: {
    /**
     * The format of the dataset source associated with the dataset.
     * @enum ["KNOWLEDGE_BASE"]
     */
    SourceFormat: "KNOWLEDGE_BASE";
    /**
     * The type of data source for the dataset.
     * @enum ["KENDRA"]
     */
    SourceType: "KENDRA";
    /** The details of the dataset source associated with the dataset. */
    SourceDetail?: {
      /** Contains details about the Kendra dataset source. */
      Kendra?: {
        /** The knowledgeBaseArn details for the Kendra dataset source. */
        KnowledgeBaseArn: string;
        /** The roleARN details for the Kendra dataset source. */
        RoleArn: string;
      };
    };
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
