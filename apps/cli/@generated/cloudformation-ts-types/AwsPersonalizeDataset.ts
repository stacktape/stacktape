// This file is auto-generated. Do not edit manually.
// Source: aws-personalize-dataset.json

/** Resource schema for AWS::Personalize::Dataset. */
export type AwsPersonalizeDataset = {
  /**
   * The name for the dataset
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  Name: string;
  /**
   * The ARN of the dataset
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  DatasetArn?: string;
  /**
   * The type of dataset
   * @maxLength 256
   * @enum ["Interactions","Items","Users"]
   */
  DatasetType: "Interactions" | "Items" | "Users";
  /**
   * The Amazon Resource Name (ARN) of the dataset group to add the dataset to
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  DatasetGroupArn: string;
  /**
   * The ARN of the schema to associate with the dataset. The schema defines the dataset fields.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  SchemaArn: string;
  DatasetImportJob?: {
    /**
     * The name for the dataset import job.
     * @minLength 1
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
     */
    JobName?: string;
    /**
     * The ARN of the dataset import job
     * @maxLength 256
     * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
     */
    DatasetImportJobArn?: string;
    /**
     * The ARN of the dataset that receives the imported data
     * @maxLength 256
     * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
     */
    DatasetArn?: string;
    /** The Amazon S3 bucket that contains the training data to import. */
    DataSource?: {
      /**
       * The path to the Amazon S3 bucket where the data that you want to upload to your dataset is stored.
       * @maxLength 256
       * @pattern (s3|http|https)://.+
       */
      DataLocation?: string;
    };
    /**
     * The ARN of the IAM role that has permissions to read from the Amazon S3 data source.
     * @maxLength 256
     * @pattern arn:([a-z\d-]+):iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
     */
    RoleArn?: string;
  };
};
