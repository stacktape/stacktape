// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-association.json

/**
 * The AWS::SSM::Association resource associates an SSM document in AWS Systems Manager with EC2
 * instances that contain a configuration agent to process the document.
 */
export type AwsSsmAssociation = {
  /**
   * The name of the association.
   * @pattern ^[a-zA-Z0-9_\-.]{3,128}$
   */
  AssociationName?: string;
  CalendarNames?: string[];
  /**
   * A Cron or Rate expression that specifies when the association is applied to the target.
   * @minLength 1
   * @maxLength 256
   */
  ScheduleExpression?: string;
  /** @pattern ^([1-9][0-9]{0,6}|[0]|[1-9][0-9]%|[0-9]%|100%)$ */
  MaxErrors?: string;
  /** Parameter values that the SSM document uses at runtime. */
  Parameters?: Record<string, string[]>;
  /**
   * The ID of the instance that the SSM document is associated with.
   * @pattern (^i-(\w{8}|\w{17})$)|(^mi-\w{17}$)
   */
  InstanceId?: string;
  /**
   * @minimum 15
   * @maximum 172800
   */
  WaitForSuccessTimeoutSeconds?: number;
  /** @pattern ^([1-9][0-9]{0,6}|[1-9][0-9]%|[1-9]%|100%)$ */
  MaxConcurrency?: string;
  /** @enum ["CRITICAL","HIGH","MEDIUM","LOW","UNSPECIFIED"] */
  ComplianceSeverity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNSPECIFIED";
  /**
   * The targets that the SSM document sends commands to.
   * @minItems 0
   * @maxItems 5
   */
  Targets?: {
    /**
     * @minItems 0
     * @maxItems 50
     */
    Values: unknown[];
    /** @pattern ^[\p{L}\p{Z}\p{N}_.:/=+\-@]{1,128}$|resource-groups:Name */
    Key: string;
  }[];
  /** @enum ["AUTO","MANUAL"] */
  SyncCompliance?: "AUTO" | "MANUAL";
  OutputLocation?: {
    S3Location?: {
      OutputS3KeyPrefix?: string;
      OutputS3Region?: string;
      OutputS3BucketName?: string;
    };
  };
  /**
   * @minimum 1
   * @maximum 6
   */
  ScheduleOffset?: number;
  /**
   * The name of the SSM document.
   * @pattern ^[a-zA-Z0-9_\-.:/]{3,200}$
   */
  Name: string;
  ApplyOnlyAtCronInterval?: boolean;
  /**
   * The version of the SSM document to associate with the target.
   * @pattern ([$]LATEST|[$]DEFAULT|^[1-9][0-9]*$)
   */
  DocumentVersion?: string;
  /**
   * Unique identifier of the association.
   * @pattern [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
   */
  AssociationId?: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  AutomationTargetParameterName?: string;
};
