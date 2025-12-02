// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-task.json

/** Resource schema for AWS::DataSync::Task. */
export type AwsDatasyncTask = {
  /**
   * @minItems 0
   * @maxItems 1
   */
  Excludes?: {
    /**
     * The type of filter rule to apply. AWS DataSync only supports the SIMPLE_PATTERN rule type.
     * @maxLength 128
     * @pattern ^[A-Z0-9_]+$
     * @enum ["SIMPLE_PATTERN"]
     */
    FilterType?: "SIMPLE_PATTERN";
    /**
     * A single filter string that consists of the patterns to include or exclude. The patterns are
     * delimited by "|".
     * @maxLength 409600
     * @pattern ^[^\x00]+$
     */
    Value?: string;
  }[];
  /**
   * @minItems 0
   * @maxItems 1
   */
  Includes?: {
    /**
     * The type of filter rule to apply. AWS DataSync only supports the SIMPLE_PATTERN rule type.
     * @maxLength 128
     * @pattern ^[A-Z0-9_]+$
     * @enum ["SIMPLE_PATTERN"]
     */
    FilterType?: "SIMPLE_PATTERN";
    /**
     * A single filter string that consists of the patterns to include or exclude. The patterns are
     * delimited by "|".
     * @maxLength 409600
     * @pattern ^[^\x00]+$
     */
    Value?: string;
  }[];
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
   * The ARN of the Amazon CloudWatch log group that is used to monitor and log events in the task.
   * @maxLength 562
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):logs:[a-z\-0-9]*:[0-9]{12}:log-group:([^:\*]*)(:\*)?$
   */
  CloudWatchLogGroupArn?: string;
  /**
   * The ARN of an AWS storage resource's location.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  DestinationLocationArn: string;
  /**
   * The name of a task. This value is a text reference that is used to identify the task in the
   * console.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
   */
  Name?: string;
  Options?: {
    /**
     * A file metadata value that shows the last time a file was accessed (that is, when the file was read
     * or written to).
     * @enum ["NONE","BEST_EFFORT"]
     */
    Atime?: "NONE" | "BEST_EFFORT";
    /**
     * A value that limits the bandwidth used by AWS DataSync.
     * @minimum -1
     */
    BytesPerSecond?: number;
    /**
     * The group ID (GID) of the file's owners.
     * @enum ["NONE","INT_VALUE","NAME","BOTH"]
     */
    Gid?: "NONE" | "INT_VALUE" | "NAME" | "BOTH";
    /**
     * A value that determines the types of logs that DataSync publishes to a log stream in the Amazon
     * CloudWatch log group that you provide.
     * @enum ["OFF","BASIC","TRANSFER"]
     */
    LogLevel?: "OFF" | "BASIC" | "TRANSFER";
    /**
     * A value that indicates the last time that a file was modified (that is, a file was written to)
     * before the PREPARING phase.
     * @enum ["NONE","PRESERVE"]
     */
    Mtime?: "NONE" | "PRESERVE";
    /**
     * A value that determines whether files at the destination should be overwritten or preserved when
     * copying files.
     * @enum ["ALWAYS","NEVER"]
     */
    OverwriteMode?: "ALWAYS" | "NEVER";
    /**
     * A value that determines which users or groups can access a file for a specific purpose such as
     * reading, writing, or execution of the file.
     * @enum ["NONE","PRESERVE"]
     */
    PosixPermissions?: "NONE" | "PRESERVE";
    /**
     * A value that specifies whether files in the destination that don't exist in the source file system
     * should be preserved.
     * @enum ["PRESERVE","REMOVE"]
     */
    PreserveDeletedFiles?: "PRESERVE" | "REMOVE";
    /**
     * A value that determines whether AWS DataSync should preserve the metadata of block and character
     * devices in the source file system, and recreate the files with that device name and metadata on the
     * destination.
     * @enum ["NONE","PRESERVE"]
     */
    PreserveDevices?: "NONE" | "PRESERVE";
    /**
     * A value that determines which components of the SMB security descriptor are copied during transfer.
     * @enum ["NONE","OWNER_DACL","OWNER_DACL_SACL"]
     */
    SecurityDescriptorCopyFlags?: "NONE" | "OWNER_DACL" | "OWNER_DACL_SACL";
    /**
     * A value that determines whether tasks should be queued before executing the tasks.
     * @enum ["ENABLED","DISABLED"]
     */
    TaskQueueing?: "ENABLED" | "DISABLED";
    /**
     * A value that determines whether DataSync transfers only the data and metadata that differ between
     * the source and the destination location, or whether DataSync transfers all the content from the
     * source, without comparing to the destination location.
     * @enum ["CHANGED","ALL"]
     */
    TransferMode?: "CHANGED" | "ALL";
    /**
     * The user ID (UID) of the file's owner.
     * @enum ["NONE","INT_VALUE","NAME","BOTH"]
     */
    Uid?: "NONE" | "INT_VALUE" | "NAME" | "BOTH";
    /**
     * A value that determines whether a data integrity verification should be performed at the end of a
     * task execution after all data and metadata have been transferred.
     * @enum ["POINT_IN_TIME_CONSISTENT","ONLY_FILES_TRANSFERRED","NONE"]
     */
    VerifyMode?: "POINT_IN_TIME_CONSISTENT" | "ONLY_FILES_TRANSFERRED" | "NONE";
    /**
     * A value that determines whether object tags should be read from the source object store and written
     * to the destination object store.
     * @enum ["PRESERVE","NONE"]
     */
    ObjectTags?: "PRESERVE" | "NONE";
  };
  TaskReportConfig?: {
    /** Specifies where DataSync uploads your task report. */
    Destination: {
      S3?: {
        /**
         * Specifies a bucket prefix for your report.
         * @maxLength 4096
         * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\p{Zs}]*$
         */
        Subdirectory?: string;
        /**
         * Specifies the Amazon Resource Name (ARN) of the IAM policy that allows Datasync to upload a task
         * report to your S3 bucket.
         * @maxLength 2048
         * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*$
         */
        BucketAccessRoleArn?: string;
        /**
         * Specifies the ARN of the S3 bucket where Datasync uploads your report.
         * @maxLength 156
         * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):(s3|s3-outposts):[a-z\-0-9]*:[0-9]*:.*$
         */
        S3BucketArn?: string;
      };
    };
    /**
     * Specifies the type of task report that you want.
     * @enum ["SUMMARY_ONLY","STANDARD"]
     */
    OutputType: "SUMMARY_ONLY" | "STANDARD";
    /**
     * Specifies whether you want your task report to include only what went wrong with your transfer or a
     * list of what succeeded and didn't.
     * @enum ["ERRORS_ONLY","SUCCESSES_AND_ERRORS"]
     */
    ReportLevel?: "ERRORS_ONLY" | "SUCCESSES_AND_ERRORS";
    /**
     * Specifies whether your task report includes the new version of each object transferred into an S3
     * bucket, this only applies if you enable versioning on your bucket.
     * @enum ["INCLUDE","NONE"]
     */
    ObjectVersionIds?: "INCLUDE" | "NONE";
    /**
     * Customizes the reporting level for aspects of your task report. For example, your report might
     * generally only include errors, but you could specify that you want a list of successes and errors
     * just for the files that Datasync attempted to delete in your destination location.
     */
    Overrides?: {
      /**
       * Specifies the level of reporting for the files, objects, and directories that Datasync attempted to
       * transfer.
       */
      Transferred?: {
        /**
         * Specifies whether you want your task report to include only what went wrong with your transfer or a
         * list of what succeeded and didn't.
         * @enum ["ERRORS_ONLY","SUCCESSES_AND_ERRORS"]
         */
        ReportLevel?: "ERRORS_ONLY" | "SUCCESSES_AND_ERRORS";
      };
      /**
       * Specifies the level of reporting for the files, objects, and directories that Datasync attempted to
       * verify at the end of your transfer. This only applies if you configure your task to verify data
       * during and after the transfer (which Datasync does by default)
       */
      Verified?: {
        /**
         * Specifies whether you want your task report to include only what went wrong with your transfer or a
         * list of what succeeded and didn't.
         * @enum ["ERRORS_ONLY","SUCCESSES_AND_ERRORS"]
         */
        ReportLevel?: "ERRORS_ONLY" | "SUCCESSES_AND_ERRORS";
      };
      /**
       * Specifies the level of reporting for the files, objects, and directories that Datasync attempted to
       * delete in your destination location. This only applies if you configure your task to delete data in
       * the destination that isn't in the source.
       */
      Deleted?: {
        /**
         * Specifies whether you want your task report to include only what went wrong with your transfer or a
         * list of what succeeded and didn't.
         * @enum ["ERRORS_ONLY","SUCCESSES_AND_ERRORS"]
         */
        ReportLevel?: "ERRORS_ONLY" | "SUCCESSES_AND_ERRORS";
      };
      /**
       * Specifies the level of reporting for the files, objects, and directories that Datasync attempted to
       * skip during your transfer.
       */
      Skipped?: {
        /**
         * Specifies whether you want your task report to include only what went wrong with your transfer or a
         * list of what succeeded and didn't.
         * @enum ["ERRORS_ONLY","SUCCESSES_AND_ERRORS"]
         */
        ReportLevel?: "ERRORS_ONLY" | "SUCCESSES_AND_ERRORS";
      };
    };
  };
  ManifestConfig?: {
    /**
     * Specifies what DataSync uses the manifest for.
     * @enum ["TRANSFER"]
     */
    Action?: "TRANSFER";
    /**
     * Specifies the file format of your manifest.
     * @enum ["CSV"]
     */
    Format?: "CSV";
    /** Specifies the manifest that you want DataSync to use and where it's hosted. */
    Source: {
      S3?: {
        /**
         * Specifies the Amazon S3 object key of your manifest.
         * @maxLength 1024
         * @pattern ^[\p{L}\p{M}\p{Z}\p{S}\p{N}\p{P}\p{C}]*$
         */
        ManifestObjectPath?: string;
        /**
         * Specifies the AWS Identity and Access Management (IAM) role that allows DataSync to access your
         * manifest.
         * @maxLength 2048
         * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*$
         */
        BucketAccessRoleArn?: string;
        /**
         * Specifies the Amazon Resource Name (ARN) of the S3 bucket where you're hosting your manifest.
         * @maxLength 156
         * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):(s3|s3-outposts):[a-z\-0-9]*:[0-9]*:.*$
         */
        S3BucketArn?: string;
        /**
         * Specifies the object version ID of the manifest that you want DataSync to use.
         * @maxLength 100
         * @pattern ^.+$
         */
        ManifestObjectVersionId?: string;
      };
    };
  };
  Schedule?: {
    /**
     * A cron expression that specifies when AWS DataSync initiates a scheduled transfer from a source to
     * a destination location
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\ \_\*\?\,\|\^\-\/\#\s\(\)\+]*$
     */
    ScheduleExpression?: string;
    /**
     * Specifies status of a schedule.
     * @enum ["ENABLED","DISABLED"]
     */
    Status?: "ENABLED" | "DISABLED";
  };
  /**
   * The ARN of the source location for the task.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  SourceLocationArn: string;
  /**
   * The ARN of the task.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]*:[0-9]{12}:task/task-[0-9a-f]{17}$
   */
  TaskArn?: string;
  /**
   * Specifies the task mode for the task.
   * @enum ["BASIC","ENHANCED"]
   */
  TaskMode?: "BASIC" | "ENHANCED";
  /**
   * The status of the task that was described.
   * @enum ["AVAILABLE","CREATING","QUEUED","RUNNING","UNAVAILABLE"]
   */
  Status?: "AVAILABLE" | "CREATING" | "QUEUED" | "RUNNING" | "UNAVAILABLE";
  SourceNetworkInterfaceArns?: string[];
  DestinationNetworkInterfaceArns?: string[];
};
