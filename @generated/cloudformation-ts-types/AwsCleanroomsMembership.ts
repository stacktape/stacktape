// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-membership.json

/** Represents an AWS account that is a part of a collaboration */
export type AwsCleanroomsMembership = {
  /** @maxLength 100 */
  Arn?: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this cleanrooms membership.
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
  /** @maxLength 100 */
  CollaborationArn?: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^\d+$
   */
  CollaborationCreatorAccountId?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  CollaborationIdentifier: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  MembershipIdentifier?: string;
  QueryLogStatus: "ENABLED" | "DISABLED";
  JobLogStatus?: "ENABLED" | "DISABLED";
  DefaultResultConfiguration?: {
    OutputConfiguration: {
      S3: {
        ResultFormat: "CSV" | "PARQUET";
        /**
         * @minLength 3
         * @maxLength 63
         */
        Bucket: string;
        KeyPrefix?: string;
        SingleFileOutput?: boolean;
      };
    };
    /**
     * @minLength 32
     * @maxLength 512
     */
    RoleArn?: string;
  };
  DefaultJobResultConfiguration?: {
    OutputConfiguration: {
      S3: {
        /**
         * @minLength 3
         * @maxLength 63
         */
        Bucket: string;
        KeyPrefix?: string;
      };
    };
    /**
     * @minLength 32
     * @maxLength 512
     */
    RoleArn: string;
  };
  PaymentConfiguration?: {
    QueryCompute: {
      IsResponsible: boolean;
    };
    MachineLearning?: {
      ModelTraining?: {
        IsResponsible: boolean;
      };
      ModelInference?: {
        IsResponsible: boolean;
      };
    };
    JobCompute?: {
      IsResponsible: boolean;
    };
  };
};
