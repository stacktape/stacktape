// This file is auto-generated. Do not edit manually.
// Source: aws-m2-application.json

/** Represents an application that runs on an AWS Mainframe Modernization Environment */
export type AwsM2Application = {
  /** @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9/][A-Za-z0-9:_/+=,@.-]{0,1023}$ */
  ApplicationArn?: string;
  /** @pattern ^\S{1,80}$ */
  ApplicationId?: string;
  Definition?: {
    /** @pattern ^\S{1,2000}$ */
    S3Location: string;
  } | {
    /**
     * @minLength 1
     * @maxLength 65000
     */
    Content: string;
  };
  /**
   * @minLength 0
   * @maxLength 500
   */
  Description?: string;
  EngineType: "microfocus" | "bluage";
  /**
   * The ID or the Amazon Resource Name (ARN) of the customer managed KMS Key used for encrypting
   * application-related resources.
   * @maxLength 2048
   */
  KmsKeyId?: string;
  /** @pattern ^[A-Za-z0-9][A-Za-z0-9_\-]{1,59}$ */
  Name: string;
  /** @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]|):[0-9]{12}:[A-Za-z0-9/][A-Za-z0-9:_/+=,@.-]{0,1023}$ */
  RoleArn?: string;
  Tags?: Record<string, string>;
};
