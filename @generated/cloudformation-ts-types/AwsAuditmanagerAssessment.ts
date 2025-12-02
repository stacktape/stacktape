// This file is auto-generated. Do not edit manually.
// Source: aws-auditmanager-assessment.json

/** An entity that defines the scope of audit evidence collected by AWS Audit Manager. */
export type AwsAuditmanagerAssessment = {
  FrameworkId?: string;
  AssessmentId?: string;
  AwsAccount?: {
    Id?: string;
    EmailAddress?: string;
    Name?: string;
  };
  Arn?: string;
  /** The tags associated with the assessment. */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The list of delegations. */
  Delegations?: ({
    LastUpdated?: number;
    ControlSetId?: string;
    CreationTime?: number;
    CreatedBy?: string;
    RoleArn?: string;
    AssessmentName?: string;
    Comment?: string;
    Id?: string;
    RoleType?: "PROCESS_OWNER" | "RESOURCE_OWNER";
    AssessmentId?: string;
    Status?: "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETE";
  })[];
  /** The list of roles for the specified assessment. */
  Roles?: ({
    RoleArn?: string;
    RoleType?: "PROCESS_OWNER" | "RESOURCE_OWNER";
  })[];
  Scope?: {
    /** The AWS accounts included in scope. */
    AwsAccounts?: {
      Id?: string;
      EmailAddress?: string;
      Name?: string;
    }[];
    /** The AWS services included in scope. */
    AwsServices?: {
      ServiceName?: string;
    }[];
  };
  AssessmentReportsDestination?: {
    Destination?: string;
    DestinationType?: "S3";
  };
  Status?: "ACTIVE" | "INACTIVE";
  CreationTime?: number;
  Name?: string;
  Description?: string;
};
