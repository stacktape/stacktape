// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-assistant.json

/** Definition of AWS::Wisdom::Assistant Resource Type */
export type AwsWisdomAssistant = {
  Type: "AGENT";
  /**
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$ */
  AssistantArn?: string;
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
  AssistantId?: string;
  ServerSideEncryptionConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 4096
     */
    KmsKeyId?: string;
  };
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
};
