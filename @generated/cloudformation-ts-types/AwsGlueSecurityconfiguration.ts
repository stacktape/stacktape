// This file is auto-generated. Do not edit manually.
// Source: aws-glue-securityconfiguration.json

/** Resource Type definition for AWS::Glue::SecurityConfiguration */
export type AwsGlueSecurityconfiguration = {
  EncryptionConfiguration: {
    S3Encryptions?: Record<string, unknown>;
    JobBookmarksEncryption?: {
      KmsKeyArn?: string;
      JobBookmarksEncryptionMode?: string;
    };
    CloudWatchEncryption?: {
      KmsKeyArn?: string;
      CloudWatchEncryptionMode?: string;
    };
  };
  Name: string;
  Id?: string;
};
