// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationefs.json

/** Resource schema for AWS::DataSync::LocationEFS. */
export type AwsDatasyncLocationefs = {
  Ec2Config: {
    /**
     * The Amazon Resource Names (ARNs) of the security groups that are configured for the Amazon EC2
     * resource.
     * @minItems 1
     * @maxItems 5
     */
    SecurityGroupArns: string[];
    /**
     * The ARN of the subnet that DataSync uses to access the target EFS file system.
     * @maxLength 128
     * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):ec2:[a-z\-0-9]*:[0-9]{12}:subnet/.*$
     */
    SubnetArn: string;
  };
  /**
   * The Amazon Resource Name (ARN) for the Amazon EFS file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):elasticfilesystem:[a-z\-0-9]*:[0-9]{12}:file-system/fs-.*$
   */
  EfsFilesystemArn?: string;
  /**
   * The Amazon Resource Name (ARN) for the Amazon EFS Access point that DataSync uses when accessing
   * the EFS file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):elasticfilesystem:[a-z\-0-9]+:[0-9]{12}:access-point/fsap-[0-9a-f]{8,40}$
   */
  AccessPointArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the AWS IAM role that the DataSync will assume when mounting the
   * EFS file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*$
   */
  FileSystemAccessRoleArn?: string;
  /**
   * Protocol that is used for encrypting the traffic exchanged between the DataSync Agent and the EFS
   * file system.
   * @enum ["NONE","TLS1_2"]
   */
  InTransitEncryption?: "NONE" | "TLS1_2";
  /**
   * A subdirectory in the location's path. This subdirectory in the EFS file system is used to read
   * data from the EFS source location or write data to the EFS destination.
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  Subdirectory?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:/-]+$
     */
    Key: string;
    /**
     * The value for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
     */
    Value: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the Amazon EFS file system location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the EFS location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw)://[a-zA-Z0-9.\-/]+$
   */
  LocationUri?: string;
};
