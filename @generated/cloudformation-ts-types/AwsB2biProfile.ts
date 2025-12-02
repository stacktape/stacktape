// This file is auto-generated. Do not edit manually.
// Source: aws-b2bi-profile.json

/** Definition of AWS::B2BI::Profile Resource Type */
export type AwsB2biProfile = {
  /**
   * @minLength 1
   * @maxLength 254
   */
  BusinessName: string;
  CreatedAt?: string;
  /**
   * @minLength 5
   * @maxLength 254
   * @pattern ^[\w\.\-]+@[\w\.\-]+$
   */
  Email?: string;
  /**
   * @minLength 1
   * @maxLength 512
   */
  LogGroupName?: string;
  Logging: "ENABLED" | "DISABLED";
  ModifiedAt?: string;
  /**
   * @minLength 1
   * @maxLength 254
   */
  Name: string;
  /**
   * @minLength 7
   * @maxLength 22
   * @pattern ^\+?([0-9 \t\-()\/]{7,})(?:\s*(?:#|x\.?|ext\.?|extension) \t*(\d+))?$
   */
  Phone: string;
  /**
   * @minLength 1
   * @maxLength 255
   */
  ProfileArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ProfileId?: string;
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
};
