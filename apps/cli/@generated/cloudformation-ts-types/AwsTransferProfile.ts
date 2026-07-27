// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-profile.json

/** Resource Type definition for AWS::Transfer::Profile */
export type AwsTransferProfile = {
  /**
   * AS2 identifier agreed with a trading partner.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\u0020-\u007E\s]*$
   */
  As2Id: string;
  /**
   * Enum specifying whether the profile is local or associated with a trading partner.
   * @enum ["LOCAL","PARTNER"]
   */
  ProfileType: "LOCAL" | "PARTNER";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The name assigned to the tag that you create.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Contains one or more values that you assigned to the key name you create.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * List of the certificate IDs associated with this profile to be used for encryption and signing of
   * AS2 messages.
   */
  CertificateIds?: string[];
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the profile.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
  /**
   * A unique identifier for the profile
   * @minLength 19
   * @maxLength 19
   * @pattern ^p-([0-9a-f]{17})$
   */
  ProfileId?: string;
};
