// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-collaboration.json

/** Represents a collaboration between AWS accounts that allows for secure data collaboration */
export type AwsCleanroomsCollaboration = {
  /** @maxLength 100 */
  Arn?: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this cleanrooms collaboration.
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
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  CollaborationIdentifier?: string;
  CreatorDisplayName: string;
  CreatorMemberAbilities?: ("CAN_QUERY" | "CAN_RUN_JOB" | "CAN_RECEIVE_RESULTS")[];
  CreatorMLMemberAbilities?: {
    CustomMLMemberAbilities: ("CAN_RECEIVE_MODEL_OUTPUT" | "CAN_RECEIVE_INFERENCE_OUTPUT")[];
  };
  DataEncryptionMetadata?: {
    AllowCleartext: boolean;
    AllowDuplicates: boolean;
    AllowJoinsOnColumnsWithDifferentNames: boolean;
    PreserveNulls: boolean;
  };
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^(?!\s*$)[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description: string;
  /**
   * @minItems 0
   * @maxItems 9
   */
  Members?: ({
    /**
     * @minLength 12
     * @maxLength 12
     * @pattern ^\d+$
     */
    AccountId: string;
    MemberAbilities?: ("CAN_QUERY" | "CAN_RUN_JOB" | "CAN_RECEIVE_RESULTS")[];
    MLMemberAbilities?: {
      CustomMLMemberAbilities: ("CAN_RECEIVE_MODEL_OUTPUT" | "CAN_RECEIVE_INFERENCE_OUTPUT")[];
    };
    DisplayName: string;
    PaymentConfiguration?: {
      JobCompute?: {
        IsResponsible: boolean;
      };
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
    };
  })[];
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^(?!\s*$)[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t]*$
   */
  Name: string;
  JobLogStatus?: "ENABLED" | "DISABLED";
  QueryLogStatus: "ENABLED" | "DISABLED";
  AnalyticsEngine?: "CLEAN_ROOMS_SQL" | "SPARK";
  CreatorPaymentConfiguration?: {
    JobCompute?: {
      IsResponsible: boolean;
    };
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
  };
  AutoApprovedChangeTypes?: "ADD_MEMBER"[];
  AllowedResultRegions?: ("us-west-1" | "us-west-2" | "us-east-1" | "us-east-2" | "af-south-1" | "ap-east-1" | "ap-east-2" | "ap-south-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-southeast-3" | "ap-southeast-5" | "ap-southeast-4" | "ap-southeast-7" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-1" | "ap-northeast-2" | "ca-central-1" | "ca-west-1" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-central-2" | "eu-central-1" | "eu-north-1" | "eu-west-1" | "eu-west-2" | "me-south-1" | "me-central-1" | "il-central-1" | "sa-east-1" | "mx-central-1")[];
};
