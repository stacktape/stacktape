// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-document.json

/**
 * The AWS::SSM::Document resource is an SSM document in AWS Systems Manager that defines the actions
 * that Systems Manager performs, which can be used to set up and run commands on your instances.
 */
export type AwsSsmDocument = {
  /** The content for the Systems Manager document in JSON, YAML or String format. */
  Content: Record<string, unknown> | string;
  /**
   * A list of key and value pairs that describe attachments to a version of a document.
   * @minItems 0
   * @maxItems 20
   */
  Attachments?: ({
    /**
     * The key of a key-value pair that identifies the location of an attachment to a document.
     * @enum ["SourceUrl","S3FileUrl","AttachmentReference"]
     */
    Key?: "SourceUrl" | "S3FileUrl" | "AttachmentReference";
    /**
     * The value of a key-value pair that identifies the location of an attachment to a document. The
     * format for Value depends on the type of key you specify.
     * @minItems 1
     * @maxItems 1
     */
    Values?: string[];
    /**
     * The name of the document attachment file.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Name?: string;
  })[];
  /**
   * A name for the Systems Manager document.
   * @pattern ^[a-zA-Z0-9_\-.]{3,128}$
   */
  Name?: string;
  /**
   * An optional field specifying the version of the artifact you are creating with the document. This
   * value is unique across all versions of a document, and cannot be changed.
   * @pattern ^[a-zA-Z0-9_\-.]{1,128}$
   */
  VersionName?: string;
  /**
   * The type of document to create.
   * @enum ["ApplicationConfiguration","ApplicationConfigurationSchema","Automation","Automation.ChangeTemplate","AutoApprovalPolicy","ChangeCalendar","CloudFormation","Command","DeploymentStrategy","ManualApprovalPolicy","Package","Policy","ProblemAnalysis","ProblemAnalysisTemplate","Session"]
   */
  DocumentType?: "ApplicationConfiguration" | "ApplicationConfigurationSchema" | "Automation" | "Automation.ChangeTemplate" | "AutoApprovalPolicy" | "ChangeCalendar" | "CloudFormation" | "Command" | "DeploymentStrategy" | "ManualApprovalPolicy" | "Package" | "Policy" | "ProblemAnalysis" | "ProblemAnalysisTemplate" | "Session";
  /**
   * Specify the document format for the request. The document format can be either JSON or YAML. JSON
   * is the default format.
   * @default "JSON"
   * @enum ["YAML","JSON","TEXT"]
   */
  DocumentFormat?: "YAML" | "JSON" | "TEXT";
  /**
   * Specify a target type to define the kinds of resources the document can run on.
   * @pattern ^\/[\w\.\-\:\/]*$
   */
  TargetType?: string;
  /**
   * Optional metadata that you assign to a resource. Tags enable you to categorize a resource in
   * different ways, such as by purpose, owner, or environment.
   * @maxItems 1000
   */
  Tags?: {
    /**
     * The name of the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key?: string;
    /**
     * The value of the tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value?: string;
  }[];
  /**
   * A list of SSM documents required by a document. For example, an ApplicationConfiguration document
   * requires an ApplicationConfigurationSchema document.
   * @minItems 1
   */
  Requires?: {
    /**
     * The name of the required SSM document. The name can be an Amazon Resource Name (ARN).
     * @maxLength 200
     * @pattern ^[a-zA-Z0-9_\-.:/]{3,200}$
     */
    Name?: string;
    /**
     * The document version required by the current document.
     * @maxLength 8
     * @pattern ([$]LATEST|[$]DEFAULT|^[1-9][0-9]*$)
     */
    Version?: string;
  }[];
  /**
   * Update method - when set to 'Replace', the update will replace the existing document; when set to
   * 'NewVersion', the update will create a new version.
   * @default "Replace"
   * @enum ["Replace","NewVersion"]
   */
  UpdateMethod?: "Replace" | "NewVersion";
};
