// This file is auto-generated. Do not edit manually.
// Source: aws-backupgateway-hypervisor.json

/** Definition of AWS::BackupGateway::Hypervisor Resource Type */
export type AwsBackupgatewayHypervisor = {
  /**
   * @minLength 3
   * @maxLength 128
   * @pattern ^.+$
   */
  Host?: string;
  /**
   * @minLength 50
   * @maxLength 500
   * @pattern ^arn:(aws|aws-cn|aws-us-gov):backup-gateway(:[a-zA-Z-0-9]+){3}\/[a-zA-Z-0-9]+$
   */
  HypervisorArn?: string;
  /**
   * @minLength 50
   * @maxLength 500
   * @pattern ^(^arn:(aws|aws-cn|aws-us-gov):kms:([a-zA-Z0-9-]+):([0-9]+):(key|alias)/(\S+)$)|(^alias/(\S+)$)$
   */
  KmsKeyArn?: string;
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern ^$|^arn:(aws|aws-cn|aws-us-gov):logs:([a-zA-Z0-9-]+):([0-9]+):log-group:[a-zA-Z0-9_\-\/\.]+:\*$
   */
  LogGroupArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9-]*$
   */
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[ -~]+$
   */
  Password?: string;
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
     * @pattern ^[^\x00]*$
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[ -\.0-\[\]-~]*[!-\.0-\[\]-~][ -\.0-\[\]-~]*$
   */
  Username?: string;
};
