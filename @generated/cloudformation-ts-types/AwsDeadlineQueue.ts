// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-queue.json

/** Definition of AWS::Deadline::Queue Resource Type */
export type AwsDeadlineQueue = {
  /**
   * @minItems 0
   * @maxItems 20
   * @uniqueItems true
   */
  AllowedStorageProfileIds?: string[];
  DefaultBudgetAction?: "NONE" | "STOP_SCHEDULING_AND_COMPLETE_TASKS" | "STOP_SCHEDULING_AND_CANCEL_TASKS";
  /**
   * @default ""
   * @minLength 0
   * @maxLength 100
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  JobAttachmentSettings?: {
    /**
     * @minLength 3
     * @maxLength 63
     * @pattern (?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)
     */
    S3BucketName: string;
    /**
     * @minLength 1
     * @maxLength 63
     */
    RootPrefix: string;
  };
  JobRunAsUser?: {
    Posix?: {
      /**
       * @minLength 0
       * @maxLength 31
       * @pattern ^(?:[a-z][a-z0-9-]{0,30})?$
       */
      User: string;
      /**
       * @minLength 0
       * @maxLength 31
       * @pattern ^(?:[a-z][a-z0-9-]{0,30})?$
       */
      Group: string;
    };
    Windows?: {
      /**
       * @minLength 0
       * @maxLength 111
       * @pattern ^[^"'/\[\]:;|=,+*?<>\s]*$
       */
      User: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:\d{12}:secret:[a-zA-Z0-9-/_+=.@]{1,2028}$
       */
      PasswordArn: string;
    };
    RunAs: "QUEUE_CONFIGURED_USER" | "WORKER_AGENT_USER";
  };
  /** @pattern ^queue-[0-9a-f]{32}$ */
  QueueId?: string;
  /**
   * @minItems 0
   * @maxItems 20
   * @uniqueItems true
   */
  RequiredFileSystemLocationNames?: string[];
  /** @pattern ^arn:(aws[a-zA-Z-]*):iam::\d{12}:role(/[!-.0-~]+)*/[\w+=,.@-]+$ */
  RoleArn?: string;
  /** @pattern ^arn:* */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
