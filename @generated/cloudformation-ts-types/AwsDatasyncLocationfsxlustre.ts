// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationfsxlustre.json

/** Resource schema for AWS::DataSync::LocationFSxLustre. */
export type AwsDatasyncLocationfsxlustre = {
  /**
   * The Amazon Resource Name (ARN) for the FSx for Lustre file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):fsx:[a-z\-0-9]+:[0-9]{12}:file-system/fs-[0-9a-f]+$
   */
  FsxFilesystemArn?: string;
  /**
   * The ARNs of the security groups that are to use to configure the FSx for Lustre file system.
   * @minItems 1
   * @maxItems 5
   */
  SecurityGroupArns: string[];
  /**
   * A subdirectory in the location's path.
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  Subdirectory?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 0
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
   * The Amazon Resource Name (ARN) of the Amazon FSx for Lustre file system location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the FSx for Lustre location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw|hdfs|fsxl)://[a-zA-Z0-9.:/\-]+$
   */
  LocationUri?: string;
};
