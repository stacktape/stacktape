// This file is auto-generated. Do not edit manually.
// Source: aws-opsworkscm-server.json

/** Resource Type definition for AWS::OpsWorksCM::Server */
export type AwsOpsworkscmServer = {
  /**
   * @maxLength 10000
   * @pattern .*
   */
  KeyPair?: string;
  /** @maxLength 10000 */
  EngineVersion?: string;
  /**
   * @maxLength 10000
   * @pattern arn:aws:iam::[0-9]{12}:role/.*
   */
  ServiceRoleArn: string;
  DisableAutomatedBackup?: boolean;
  /**
   * @maxLength 79
   * @pattern [a-zA-Z][a-zA-Z0-9\-\.\:]*
   */
  BackupId?: string;
  /** @maxLength 10000 */
  EngineModel?: string;
  /**
   * @maxLength 10000
   * @pattern ^((Mon|Tue|Wed|Thu|Fri|Sat|Sun):)?([0-1][0-9]|2[0-3]):[0-5][0-9]$
   */
  PreferredMaintenanceWindow?: string;
  AssociatePublicIpAddress?: boolean;
  /**
   * @maxLength 10000
   * @pattern arn:aws:iam::[0-9]{12}:instance-profile/.*
   */
  InstanceProfileArn: string;
  /**
   * @maxLength 2097152
   * @pattern (?s)\s*-----BEGIN CERTIFICATE-----.+-----END CERTIFICATE-----\s*
   */
  CustomCertificate?: string;
  /**
   * @maxLength 10000
   * @pattern ^((Mon|Tue|Wed|Thu|Fri|Sat|Sun):)?([0-1][0-9]|2[0-3]):[0-5][0-9]$
   */
  PreferredBackupWindow?: string;
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  /** @uniqueItems false */
  SubnetIds?: string[];
  /**
   * @maxLength 253
   * @pattern ^(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$
   */
  CustomDomain?: string;
  /** @maxLength 10000 */
  Endpoint?: string;
  /**
   * @maxLength 4096
   * @pattern (?ms)\s*^-----BEGIN (?-s:.*)PRIVATE KEY-----$.*?^-----END (?-s:.*)PRIVATE KEY-----$\s*
   */
  CustomPrivateKey?: string;
  /**
   * @minLength 1
   * @maxLength 40
   * @pattern [a-zA-Z][a-zA-Z0-9\-]*
   */
  ServerName?: string;
  /** @uniqueItems false */
  EngineAttributes?: {
    /**
     * @maxLength 10000
     * @pattern (?s).*
     */
    Value?: string;
    /**
     * @maxLength 10000
     * @pattern (?s).*
     */
    Name?: string;
  }[];
  /** @minLength 1 */
  BackupRetentionCount?: number;
  /** @maxLength 10000 */
  Arn?: string;
  /** @maxLength 10000 */
  InstanceType: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
  }[];
  /** @maxLength 10000 */
  Engine?: string;
};
