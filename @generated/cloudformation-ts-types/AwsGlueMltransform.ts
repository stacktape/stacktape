// This file is auto-generated. Do not edit manually.
// Source: aws-glue-mltransform.json

/** Resource Type definition for AWS::Glue::MLTransform */
export type AwsGlueMltransform = {
  MaxRetries?: number;
  Description?: string;
  TransformEncryption?: {
    TaskRunSecurityConfigurationName?: string;
    MLUserDataEncryption?: {
      KmsKeyId?: string;
      MLUserDataEncryptionMode: string;
    };
  };
  Timeout?: number;
  Name?: string;
  Role: string;
  WorkerType?: string;
  GlueVersion?: string;
  TransformParameters: {
    TransformType: string;
    FindMatchesParameters?: {
      PrecisionRecallTradeoff?: number;
      EnforceProvidedLabels?: boolean;
      PrimaryKeyColumnName: string;
      AccuracyCostTradeoff?: number;
    };
  };
  Id?: string;
  InputRecordTables: {
    /** @uniqueItems false */
    GlueTables?: {
      ConnectionName?: string;
      DatabaseName: string;
      TableName: string;
      CatalogId?: string;
    }[];
  };
  NumberOfWorkers?: number;
  Tags?: Record<string, unknown>;
  MaxCapacity?: number;
};
