// This file is auto-generated. Do not edit manually.
// Source: aws-cleanroomsml-trainingdataset.json

/** Definition of AWS::CleanRoomsML::TrainingDataset Resource Type */
export type AwsCleanroomsmlTrainingdataset = {
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 63
   * @pattern ^(?!\s*$)[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t]*$
   */
  Name: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z]*:iam::[0-9]{12}:role/.+$
   */
  RoleArn: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this cleanrooms-ml training dataset.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minItems 1
   * @maxItems 1
   */
  TrainingData: ({
    Type: "INTERACTIONS";
    InputConfig: {
      /**
       * @minItems 1
       * @maxItems 100
       */
      Schema: ({
        /**
         * @minLength 1
         * @maxLength 128
         * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
         */
        ColumnName: string;
        /**
         * @minItems 1
         * @maxItems 1
         */
        ColumnTypes: ("USER_ID" | "ITEM_ID" | "TIMESTAMP" | "CATEGORICAL_FEATURE" | "NUMERICAL_FEATURE")[];
      })[];
      DataSource: {
        GlueDataSource: {
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
           */
          TableName: string;
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_]+-)*([a-zA-Z0-9_]+))?$
           */
          DatabaseName: string;
          /**
           * @minLength 12
           * @maxLength 12
           * @pattern ^[0-9]{12}$
           */
          CatalogId?: string;
        };
      };
    };
  })[];
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z]*:cleanrooms-ml:[-a-z0-9]+:[0-9]{12}:training-dataset/[-a-zA-Z0-9_/.]+$
   */
  TrainingDatasetArn?: string;
  Status?: "ACTIVE";
};
