// This file is auto-generated. Do not edit manually.
// Source: aws-glue-datacatalogencryptionsettings.json

/** Resource Type definition for AWS::Glue::DataCatalogEncryptionSettings */
export type AwsGlueDatacatalogencryptionsettings = {
  CatalogId: string;
  DataCatalogEncryptionSettings: {
    ConnectionPasswordEncryption?: {
      KmsKeyId?: string;
      ReturnConnectionPasswordEncrypted?: boolean;
    };
    EncryptionAtRest?: {
      CatalogEncryptionMode?: string;
      CatalogEncryptionServiceRole?: string;
      SseAwsKmsKeyId?: string;
    };
  };
  Id?: string;
};
