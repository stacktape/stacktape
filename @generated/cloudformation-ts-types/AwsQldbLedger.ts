// This file is auto-generated. Do not edit manually.
// Source: aws-qldb-ledger.json

/** Resource Type definition for AWS::QLDB::Ledger */
export type AwsQldbLedger = {
  PermissionsMode: string;
  DeletionProtection?: boolean;
  Id?: string;
  KmsKey?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name?: string;
};
