// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-agreement.json

/** Resource Type definition for AWS::Transfer::Agreement */
export type AwsTransferAgreement = {
  /**
   * A textual description for the agreement.
   * @minLength 1
   * @maxLength 200
   * @pattern ^[\u0021-\u007E]+$
   */
  Description?: string;
  /**
   * A unique identifier for the server.
   * @minLength 19
   * @maxLength 19
   * @pattern ^s-([0-9a-f]{17})$
   */
  ServerId: string;
  /**
   * A unique identifier for the local profile.
   * @minLength 19
   * @maxLength 19
   * @pattern ^p-([0-9a-f]{17})$
   */
  LocalProfileId: string;
  /**
   * A unique identifier for the partner profile.
   * @minLength 19
   * @maxLength 19
   * @pattern ^p-([0-9a-f]{17})$
   */
  PartnerProfileId: string;
  /**
   * Specifies the base directory for the agreement.
   * @maxLength 1024
   * @pattern ^(|/.*)$
   */
  BaseDirectory?: string;
  /**
   * Specifies the access role for the agreement.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:.*role/.*
   */
  AccessRole: string;
  /**
   * Specifies the status of the agreement.
   * @enum ["ACTIVE","INACTIVE"]
   */
  Status?: "ACTIVE" | "INACTIVE";
  /**
   * Key-value pairs that can be used to group and search for agreements. Tags are metadata attached to
   * agreements for any purpose.
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
   * A unique identifier for the agreement.
   * @minLength 19
   * @maxLength 19
   * @pattern ^a-([0-9a-f]{17})$
   */
  AgreementId?: string;
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the agreement.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
  /**
   * Specifies whether to preserve the filename received for this agreement.
   * @enum ["ENABLED","DISABLED"]
   */
  PreserveFilename?: "ENABLED" | "DISABLED";
  /**
   * Specifies whether to enforce an AS2 message is signed for this agreement.
   * @enum ["ENABLED","DISABLED"]
   */
  EnforceMessageSigning?: "ENABLED" | "DISABLED";
  /** Specifies a separate directory for each type of file to store for an AS2 message. */
  CustomDirectories?: {
    /**
     * Specifies a location to store the failed files for an AS2 message.
     * @pattern (|/.*)
     */
    FailedFilesDirectory: string;
    /**
     * Specifies a location to store the MDN file for an AS2 message.
     * @pattern (|/.*)
     */
    MdnFilesDirectory: string;
    /**
     * Specifies a location to store the payload file for an AS2 message.
     * @pattern (|/.*)
     */
    PayloadFilesDirectory: string;
    /**
     * Specifies a location to store the status file for an AS2 message.
     * @pattern (|/.*)
     */
    StatusFilesDirectory: string;
    /**
     * Specifies a location to store the temporary processing file for an AS2 message.
     * @pattern (|/.*)
     */
    TemporaryFilesDirectory: string;
  };
};
