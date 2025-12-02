// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationfsxontap.json

/** Resource schema for AWS::DataSync::LocationFSxONTAP. */
export type AwsDatasyncLocationfsxontap = {
  /**
   * The Amazon Resource Name (ARN) for the FSx ONTAP SVM.
   * @maxLength 162
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):fsx:[a-z\-0-9]+:[0-9]{12}:storage-virtual-machine/fs-[0-9a-f]+/svm-[0-9a-f]{17,}$
   */
  StorageVirtualMachineArn: string;
  /**
   * The Amazon Resource Name (ARN) for the FSx ONAP file system.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):fsx:[a-z\-0-9]+:[0-9]{12}:file-system/fs-[0-9a-f]+$
   */
  FsxFilesystemArn?: string;
  /**
   * The ARNs of the security groups that are to use to configure the FSx ONTAP file system.
   * @minItems 1
   * @maxItems 5
   */
  SecurityGroupArns: string[];
  Protocol?: {
    NFS?: {
      MountOptions: {
        /**
         * The specific NFS version that you want DataSync to use to mount your NFS share.
         * @enum ["AUTOMATIC","NFS3","NFS4_0","NFS4_1"]
         */
        Version?: "AUTOMATIC" | "NFS3" | "NFS4_0" | "NFS4_1";
      };
    };
    SMB?: {
      MountOptions: {
        /**
         * The specific SMB version that you want DataSync to use to mount your SMB share.
         * @enum ["AUTOMATIC","SMB2","SMB3"]
         */
        Version?: "AUTOMATIC" | "SMB2" | "SMB3";
      };
      /**
       * The name of the Windows domain that the SMB server belongs to.
       * @maxLength 253
       * @pattern ^([A-Za-z0-9]+[A-Za-z0-9-.]*)*[A-Za-z0-9-]*[A-Za-z0-9]$
       */
      Domain?: string;
      /**
       * The password of the user who can mount the share and has the permissions to access files and
       * folders in the SMB share.
       * @maxLength 104
       * @pattern ^.{0,104}$
       */
      Password: string;
      /**
       * The user who can mount the share, has the permissions to access files and folders in the SMB share.
       * @maxLength 104
       * @pattern ^[^\x5B\x5D\\/:;|=,+*?]{1,104}$
       */
      User: string;
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
   * The Amazon Resource Name (ARN) of the Amazon FSx ONTAP file system location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the FSx ONTAP file system that was described.
   * @maxLength 4360
   * @pattern ^(efs|nfs|s3|smb|hdfs|fsx[a-z0-9-]+)://[a-zA-Z0-9.:/\-]+$
   */
  LocationUri?: string;
};
