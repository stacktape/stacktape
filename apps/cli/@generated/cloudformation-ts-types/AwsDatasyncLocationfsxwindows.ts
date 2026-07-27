// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationfsxwindows.json

/** Resource schema for AWS::DataSync::LocationFSxWindows. */
export type AwsDatasyncLocationfsxwindows = {
  /**
   * The name of the Windows domain that the FSx for Windows server belongs to.
   * @maxLength 253
   * @pattern ^([A-Za-z0-9]+[A-Za-z0-9-.]*)*[A-Za-z0-9-]*[A-Za-z0-9]$
   */
  Domain?: string;
  /**
   * The Amazon Resource Name (ARN) for the FSx for Windows file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):fsx:[a-z\-0-9]*:[0-9]{12}:file-system/fs-.*$
   */
  FsxFilesystemArn?: string;
  /**
   * The password of the user who has the permissions to access files and folders in the FSx for Windows
   * file system.
   * @maxLength 104
   * @pattern ^.{0,104}$
   */
  Password?: string;
  /** The ARNs of the security groups that are to use to configure the FSx for Windows file system. */
  SecurityGroupArns: string[];
  /**
   * A subdirectory in the location's path.
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  Subdirectory?: string;
  /**
   * The user who has the permissions to access files and folders in the FSx for Windows file system.
   * @maxLength 104
   * @pattern ^[^\x5B\x5D\\/:;|=,+*?]{1,104}$
   */
  User: string;
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
   * The Amazon Resource Name (ARN) of the Amazon FSx for Windows file system location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the FSx for Windows location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw)://[a-zA-Z0-9./\-]+$
   */
  LocationUri?: string;
};
