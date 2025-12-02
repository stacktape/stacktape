// This file is auto-generated. Do not edit manually.
// Source: aws-efs-accesspoint.json

/**
 * The ``AWS::EFS::AccessPoint`` resource creates an EFS access point. An access point is an
 * application-specific view into an EFS file system that applies an operating system user and group,
 * and a file system path, to any file system request made through the access point. The operating
 * system user and group override any identity information provided by the NFS client. The file system
 * path is exposed as the access point's root directory. Applications using the access point can only
 * access data in its own directory and below. To learn more, see [Mounting a file system using EFS
 * access points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html).
 * This operation requires permissions for the ``elasticfilesystem:CreateAccessPoint`` action.
 */
export type AwsEfsAccesspoint = {
  AccessPointId?: string;
  Arn?: string;
  /** The opaque string specified in the request to ensure idempotent creation. */
  ClientToken?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * For more information, see
   * [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html).
   * @uniqueItems true
   */
  AccessPointTags?: {
    /**
     * The tag key (String). The key can't start with ``aws:``.
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * The value of the tag key.
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * The ID of the EFS file system that the access point applies to. Accepts only the ID format for
   * input when specifying a file system, for example ``fs-0123456789abcedf2``.
   */
  FileSystemId: string;
  /**
   * The full POSIX identity, including the user ID, group ID, and secondary group IDs on the access
   * point that is used for all file operations by NFS clients using the access point.
   */
  PosixUser?: {
    /** The POSIX user ID used for all file system operations using this access point. */
    Uid: string;
    /** The POSIX group ID used for all file system operations using this access point. */
    Gid: string;
    /** Secondary POSIX group IDs used for all file system operations using this access point. */
    SecondaryGids?: string[];
  };
  /**
   * The directory on the EFS file system that the access point exposes as the root directory to NFS
   * clients using the access point.
   */
  RootDirectory?: {
    /**
     * Specifies the path on the EFS file system to expose as the root directory to NFS clients using the
     * access point to access the EFS file system. A path can have up to four subdirectories. If the
     * specified path does not exist, you are required to provide the ``CreationInfo``.
     * @minLength 1
     * @maxLength 100
     */
    Path?: string;
    /**
     * (Optional) Specifies the POSIX IDs and permissions to apply to the access point's
     * ``RootDirectory``. If the ``RootDirectory`` > ``Path`` specified does not exist, EFS creates the
     * root directory using the ``CreationInfo`` settings when a client connects to an access point. When
     * specifying the ``CreationInfo``, you must provide values for all properties.
     * If you do not provide ``CreationInfo`` and the specified ``RootDirectory`` > ``Path`` does not
     * exist, attempts to mount the file system using the access point will fail.
     */
    CreationInfo?: {
      /**
       * Specifies the POSIX user ID to apply to the ``RootDirectory``. Accepts values from 0 to 2^32
       * (4294967295).
       */
      OwnerUid: string;
      /**
       * Specifies the POSIX group ID to apply to the ``RootDirectory``. Accepts values from 0 to 2^32
       * (4294967295).
       */
      OwnerGid: string;
      /**
       * Specifies the POSIX permissions to apply to the ``RootDirectory``, in the format of an octal number
       * representing the file's mode bits.
       * @pattern ^[0-7]{3,4}$
       */
      Permissions: string;
    };
  };
};
