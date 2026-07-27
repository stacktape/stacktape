// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-retriever.json

/** Definition of AWS::QBusiness::Retriever Resource Type */
export type AwsQbusinessRetriever = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  Configuration: {
    NativeIndexConfiguration: {
      /**
       * @minLength 36
       * @maxLength 36
       * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
       */
      IndexId: string;
    };
  } | {
    KendraIndexConfiguration: {
      /**
       * @minLength 36
       * @maxLength 36
       * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
       */
      IndexId: string;
    };
  };
  CreatedAt?: string;
  /**
   * @minLength 1
   * @maxLength 1000
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  RetrieverArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  RetrieverId?: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  RoleArn?: string;
  Status?: "CREATING" | "ACTIVE" | "FAILED";
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
  Type: "NATIVE_INDEX" | "KENDRA_INDEX";
  UpdatedAt?: string;
};
