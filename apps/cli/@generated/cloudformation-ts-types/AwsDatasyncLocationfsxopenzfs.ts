// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationfsxopenzfs.json

/** Resource schema for AWS::DataSync::LocationFSxOpenZFS. */
export type AwsDatasyncLocationfsxopenzfs = {
  /**
   * The Amazon Resource Name (ARN) for the FSx OpenZFS file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):fsx:[a-z\-0-9]+:[0-9]{12}:file-system/fs-[0-9a-f]+$
   */
  FsxFilesystemArn?: string;
  /**
   * The ARNs of the security groups that are to use to configure the FSx OpenZFS file system.
   * @minItems 1
   * @maxItems 5
   */
  SecurityGroupArns: string[];
  Protocol: {
    NFS?: {
      MountOptions: {
        /**
         * The specific NFS version that you want DataSync to use to mount your NFS share.
         * @enum ["AUTOMATIC","NFS3","NFS4_0","NFS4_1"]
         */
        Version?: "AUTOMATIC" | "NFS3" | "NFS4_0" | "NFS4_1";
      };
    };
  };
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
   * The Amazon Resource Name (ARN) of the Amazon FSx OpenZFS file system location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the FSx OpenZFS that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw|hdfs|fsxl|fsxz)://[a-zA-Z0-9.:/\-]+$
   */
  LocationUri?: string;
};
