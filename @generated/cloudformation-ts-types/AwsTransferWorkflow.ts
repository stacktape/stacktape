// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-workflow.json

/** Resource Type definition for AWS::Transfer::Workflow */
export type AwsTransferWorkflow = {
  /**
   * Specifies the steps (actions) to take if any errors are encountered during execution of the
   * workflow.
   * @maxItems 8
   * @uniqueItems true
   */
  OnExceptionSteps?: ({
    /** Details for a step that performs a file copy. */
    CopyStepDetails?: {
      DestinationFileLocation?: {
        S3FileLocation?: {
          /**
           * Specifies the S3 bucket that contains the file.
           * @minLength 3
           * @maxLength 63
           * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          Bucket?: string;
          /**
           * The name assigned to the file when it was created in S3. You use the object key to retrieve the
           * object.
           * @minLength 0
           * @maxLength 1024
           * @pattern .*
           */
          Key?: string;
        };
      };
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * A flag that indicates whether or not to overwrite an existing file of the same name. The default is
       * FALSE.
       * @enum ["TRUE","FALSE"]
       */
      OverwriteExisting?: "TRUE" | "FALSE";
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that invokes a lambda function. */
    CustomStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * The ARN for the lambda function that is being called.
       * @minLength 0
       * @maxLength 170
       * @pattern arn:[a-z-]+:lambda:.*$
       */
      Target?: string;
      /**
       * Timeout, in seconds, for the step.
       * @minimum 1
       * @maximum 1800
       */
      TimeoutSeconds?: number;
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that performs a file decryption. */
    DecryptStepDetails?: {
      DestinationFileLocation: {
        S3FileLocation?: {
          /**
           * Specifies the S3 bucket that contains the file.
           * @minLength 3
           * @maxLength 63
           * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          Bucket?: string;
          /**
           * The name assigned to the file when it was created in S3. You use the object key to retrieve the
           * object.
           * @minLength 0
           * @maxLength 1024
           * @pattern .*
           */
          Key?: string;
        };
        EfsFileLocation?: {
          /**
           * Specifies the EFS filesystem that contains the file.
           * @minLength 0
           * @maxLength 128
           * @pattern ^(arn:aws[-a-z]*:elasticfilesystem:[0-9a-z-:]+:(access-point/fsap|file-system/fs)-[0-9a-f]{8,40}|fs(ap)?-[0-9a-f]{8,40})$
           */
          FileSystemId?: string;
          /**
           * The name assigned to the file when it was created in EFS. You use the object path to retrieve the
           * object.
           * @minLength 1
           * @maxLength 65536
           * @pattern ^[^\x00]+$
           */
          Path?: string;
        };
      };
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Specifies which encryption method to use.
       * @enum ["PGP"]
       */
      Type: "PGP";
      /**
       * A flag that indicates whether or not to overwrite an existing file of the same name. The default is
       * FALSE.
       * @enum ["TRUE","FALSE"]
       */
      OverwriteExisting?: "TRUE" | "FALSE";
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that deletes the file. */
    DeleteStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that creates one or more tags. */
    TagStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Array that contains from 1 to 10 key/value pairs.
       * @maxItems 10
       * @uniqueItems true
       */
      Tags?: {
        /**
         * The name assigned to the tag that you create.
         * @minLength 1
         * @maxLength 128
         */
        Key: string;
        /**
         * The value that corresponds to the key.
         * @minLength 0
         * @maxLength 256
         */
        Value: string;
      }[];
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** @enum ["COPY","CUSTOM","DECRYPT","DELETE","TAG"] */
    Type?: "COPY" | "CUSTOM" | "DECRYPT" | "DELETE" | "TAG";
  })[];
  /**
   * Specifies the details for the steps that are in the specified workflow.
   * @maxItems 8
   * @uniqueItems true
   */
  Steps: ({
    /** Details for a step that performs a file copy. */
    CopyStepDetails?: {
      DestinationFileLocation?: {
        S3FileLocation?: {
          /**
           * Specifies the S3 bucket that contains the file.
           * @minLength 3
           * @maxLength 63
           * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          Bucket?: string;
          /**
           * The name assigned to the file when it was created in S3. You use the object key to retrieve the
           * object.
           * @minLength 0
           * @maxLength 1024
           * @pattern .*
           */
          Key?: string;
        };
      };
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * A flag that indicates whether or not to overwrite an existing file of the same name. The default is
       * FALSE.
       * @enum ["TRUE","FALSE"]
       */
      OverwriteExisting?: "TRUE" | "FALSE";
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that invokes a lambda function. */
    CustomStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * The ARN for the lambda function that is being called.
       * @minLength 0
       * @maxLength 170
       * @pattern arn:[a-z-]+:lambda:.*$
       */
      Target?: string;
      /**
       * Timeout, in seconds, for the step.
       * @minimum 1
       * @maximum 1800
       */
      TimeoutSeconds?: number;
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that performs a file decryption. */
    DecryptStepDetails?: {
      DestinationFileLocation: {
        S3FileLocation?: {
          /**
           * Specifies the S3 bucket that contains the file.
           * @minLength 3
           * @maxLength 63
           * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          Bucket?: string;
          /**
           * The name assigned to the file when it was created in S3. You use the object key to retrieve the
           * object.
           * @minLength 0
           * @maxLength 1024
           * @pattern .*
           */
          Key?: string;
        };
        EfsFileLocation?: {
          /**
           * Specifies the EFS filesystem that contains the file.
           * @minLength 0
           * @maxLength 128
           * @pattern ^(arn:aws[-a-z]*:elasticfilesystem:[0-9a-z-:]+:(access-point/fsap|file-system/fs)-[0-9a-f]{8,40}|fs(ap)?-[0-9a-f]{8,40})$
           */
          FileSystemId?: string;
          /**
           * The name assigned to the file when it was created in EFS. You use the object path to retrieve the
           * object.
           * @minLength 1
           * @maxLength 65536
           * @pattern ^[^\x00]+$
           */
          Path?: string;
        };
      };
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Specifies which encryption method to use.
       * @enum ["PGP"]
       */
      Type: "PGP";
      /**
       * A flag that indicates whether or not to overwrite an existing file of the same name. The default is
       * FALSE.
       * @enum ["TRUE","FALSE"]
       */
      OverwriteExisting?: "TRUE" | "FALSE";
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that deletes the file. */
    DeleteStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** Details for a step that creates one or more tags. */
    TagStepDetails?: {
      /**
       * The name of the step, used as an identifier.
       * @minLength 0
       * @maxLength 30
       * @pattern ^[\w-]*$
       */
      Name?: string;
      /**
       * Array that contains from 1 to 10 key/value pairs.
       * @maxItems 10
       * @uniqueItems true
       */
      Tags?: {
        /**
         * The name assigned to the tag that you create.
         * @minLength 1
         * @maxLength 128
         */
        Key: string;
        /**
         * The value that corresponds to the key.
         * @minLength 0
         * @maxLength 256
         */
        Value: string;
      }[];
      /**
       * Specifies which file to use as input to the workflow step.
       * @minLength 0
       * @maxLength 256
       * @pattern ^\$\{(\w+.)+\w+\}$
       */
      SourceFileLocation?: string;
    };
    /** @enum ["COPY","CUSTOM","DECRYPT","DELETE","TAG"] */
    Type?: "COPY" | "CUSTOM" | "DECRYPT" | "DELETE" | "TAG";
  })[];
  /**
   * Key-value pairs that can be used to group and search for workflows. Tags are metadata attached to
   * workflows for any purpose.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The name assigned to the tag that you create.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Contains one or more values that you assigned to the key name you create.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * A textual description for the workflow.
   * @minLength 0
   * @maxLength 256
   * @pattern ^[\w\- ]*$
   */
  Description?: string;
  /**
   * A unique identifier for the workflow.
   * @minLength 19
   * @maxLength 19
   * @pattern ^w-([a-z0-9]{17})$
   */
  WorkflowId?: string;
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the workflow.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
};
