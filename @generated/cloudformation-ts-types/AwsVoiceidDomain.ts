// This file is auto-generated. Do not edit manually.
// Source: aws-voiceid-domain.json

/** The AWS::VoiceID::Domain resource specifies an Amazon VoiceID Domain. */
export type AwsVoiceidDomain = {
  /**
   * @minLength 1
   * @maxLength 1024
   * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-%@]*)$
   */
  Description?: string;
  /**
   * @minLength 22
   * @maxLength 22
   * @pattern ^[a-zA-Z0-9]{22}$
   */
  DomainId?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  Name: string;
  ServerSideEncryptionConfiguration: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    KmsKeyId: string;
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
