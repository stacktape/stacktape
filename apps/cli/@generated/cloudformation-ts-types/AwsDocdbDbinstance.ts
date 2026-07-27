// This file is auto-generated. Do not edit manually.
// Source: aws-docdb-dbinstance.json

/** Resource Type definition for AWS::DocDB::DBInstance */
export type AwsDocdbDbinstance = {
  DBInstanceClass: string;
  Port?: string;
  DBClusterIdentifier: string;
  AvailabilityZone?: string;
  PreferredMaintenanceWindow?: string;
  EnablePerformanceInsights?: boolean;
  AutoMinorVersionUpgrade?: boolean;
  DBInstanceIdentifier?: string;
  CACertificateIdentifier?: string;
  CertificateRotationRestart?: boolean;
  Endpoint?: string;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
