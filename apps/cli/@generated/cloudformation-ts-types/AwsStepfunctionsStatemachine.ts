// This file is auto-generated. Do not edit manually.
// Source: aws-stepfunctions-statemachine.json

/** Resource schema for StateMachine */
export type AwsStepfunctionsStatemachine = {
  /**
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 80
   */
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 1048576
   */
  DefinitionString?: string;
  /**
   * @minLength 1
   * @maxLength 256
   */
  RoleArn: string;
  /**
   * @minLength 1
   * @maxLength 80
   */
  StateMachineName?: string;
  /** @enum ["STANDARD","EXPRESS"] */
  StateMachineType?: "STANDARD" | "EXPRESS";
  /**
   * @minLength 1
   * @maxLength 256
   */
  StateMachineRevisionId?: string;
  LoggingConfiguration?: {
    /** @enum ["ALL","ERROR","FATAL","OFF"] */
    Level?: "ALL" | "ERROR" | "FATAL" | "OFF";
    IncludeExecutionData?: boolean;
    /** @minItems 1 */
    Destinations?: {
      CloudWatchLogsLogGroup?: {
        /**
         * @minLength 1
         * @maxLength 256
         */
        LogGroupArn?: string;
      };
    }[];
  };
  TracingConfiguration?: {
    Enabled?: boolean;
  };
  EncryptionConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    KmsKeyId?: string;
    /**
     * @minimum 60
     * @maximum 900
     */
    KmsDataKeyReusePeriodSeconds?: number;
    /** @enum ["CUSTOMER_MANAGED_KMS_KEY","AWS_OWNED_KEY"] */
    Type: "CUSTOMER_MANAGED_KMS_KEY" | "AWS_OWNED_KEY";
  };
  DefinitionS3Location?: {
    Bucket: string;
    Key: string;
    Version?: string;
  };
  DefinitionSubstitutions?: Record<string, string | number | boolean>;
  Definition?: Record<string, unknown>;
  /** @uniqueItems false */
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
};
