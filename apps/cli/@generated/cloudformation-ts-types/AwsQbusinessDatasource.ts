// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-datasource.json

/** Definition of AWS::QBusiness::DataSource Resource Type */
export type AwsQbusinessDatasource = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  Configuration: unknown;
  CreatedAt?: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  DataSourceArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  DataSourceId?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   * @pattern ^[\s\S]*$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 1000
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  DocumentEnrichmentConfiguration?: {
    /**
     * @minItems 1
     * @maxItems 100
     */
    InlineConfigurations?: ({
      Condition?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
         */
        Key: string;
        Operator: "GREATER_THAN" | "GREATER_THAN_OR_EQUALS" | "LESS_THAN" | "LESS_THAN_OR_EQUALS" | "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS" | "BEGINS_WITH";
        Value?: {
          /** @maxLength 2048 */
          StringValue: string;
        } | {
          StringListValue: string[];
        } | {
          LongValue: number;
        } | {
          DateValue: string;
        };
      };
      Target?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
         */
        Key: string;
        Value?: {
          /** @maxLength 2048 */
          StringValue: string;
        } | {
          StringListValue: string[];
        } | {
          LongValue: number;
        } | {
          DateValue: string;
        };
        AttributeValueOperator?: "DELETE";
      };
      DocumentContentOperator?: "DELETE";
    })[];
    PreExtractionHookConfiguration?: {
      InvocationCondition?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
         */
        Key: string;
        Operator: "GREATER_THAN" | "GREATER_THAN_OR_EQUALS" | "LESS_THAN" | "LESS_THAN_OR_EQUALS" | "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS" | "BEGINS_WITH";
        Value?: {
          /** @maxLength 2048 */
          StringValue: string;
        } | {
          StringListValue: string[];
        } | {
          LongValue: number;
        } | {
          DateValue: string;
        };
      };
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn:aws[a-zA-Z-]*:lambda:[a-z-]*-[0-9]:[0-9]{12}:function:[a-zA-Z0-9-_]+(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?(:[a-zA-Z0-9-_]+)?$
       */
      LambdaArn?: string;
      /**
       * @minLength 1
       * @maxLength 63
       * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
       */
      S3BucketName?: string;
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      RoleArn?: string;
    };
    PostExtractionHookConfiguration?: {
      InvocationCondition?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
         */
        Key: string;
        Operator: "GREATER_THAN" | "GREATER_THAN_OR_EQUALS" | "LESS_THAN" | "LESS_THAN_OR_EQUALS" | "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS" | "BEGINS_WITH";
        Value?: {
          /** @maxLength 2048 */
          StringValue: string;
        } | {
          StringListValue: string[];
        } | {
          LongValue: number;
        } | {
          DateValue: string;
        };
      };
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn:aws[a-zA-Z-]*:lambda:[a-z-]*-[0-9]:[0-9]{12}:function:[a-zA-Z0-9-_]+(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?(:[a-zA-Z0-9-_]+)?$
       */
      LambdaArn?: string;
      /**
       * @minLength 1
       * @maxLength 63
       * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
       */
      S3BucketName?: string;
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      RoleArn?: string;
    };
  };
  MediaExtractionConfiguration?: {
    ImageExtractionConfiguration?: {
      ImageExtractionStatus: "ENABLED" | "DISABLED";
    };
    AudioExtractionConfiguration?: {
      AudioExtractionStatus: "ENABLED" | "DISABLED";
    };
    VideoExtractionConfiguration?: {
      VideoExtractionStatus: "ENABLED" | "DISABLED";
    };
  };
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  IndexId: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  RoleArn?: string;
  Status?: "PENDING_CREATION" | "CREATING" | "ACTIVE" | "DELETING" | "FAILED" | "UPDATING";
  /**
   * @maxLength 998
   * @pattern ^[\s\S]*$
   */
  SyncSchedule?: string;
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
  /**
   * @minLength 1
   * @maxLength 2048
   */
  Type?: string;
  UpdatedAt?: string;
  VpcConfiguration?: {
    SubnetIds: string[];
    /**
     * @minItems 1
     * @maxItems 10
     */
    SecurityGroupIds: string[];
  };
};
