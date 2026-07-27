// This file is auto-generated. Do not edit manually.
// Source: aws-stepfunctions-activity.json

/** Resource schema for Activity */
export type AwsStepfunctionsActivity = {
  /**
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 80
   */
  Name: string;
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
};
