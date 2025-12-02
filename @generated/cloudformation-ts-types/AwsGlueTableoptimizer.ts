// This file is auto-generated. Do not edit manually.
// Source: aws-glue-tableoptimizer.json

/** Resource Type definition for AWS::Glue::TableOptimizer */
export type AwsGlueTableoptimizer = {
  DatabaseName: string;
  TableName: string;
  Type: string;
  TableOptimizerConfiguration: {
    Enabled: boolean;
    RetentionConfiguration?: {
      IcebergConfiguration?: {
        SnapshotRetentionPeriodInDays?: number;
        NumberOfSnapshotsToRetain?: number;
        CleanExpiredFiles?: boolean;
      };
    };
    VpcConfiguration?: {
      GlueConnectionName?: string;
    };
    RoleArn: string;
    OrphanFileDeletionConfiguration?: {
      IcebergConfiguration?: {
        OrphanFileRetentionPeriodInDays?: number;
        Location?: string;
      };
    };
  };
  Id?: string;
  CatalogId: string;
};
