// This file is auto-generated. Do not edit manually.
// Source: aws-omics-workflowversion.json

/** Definition of AWS::Omics::WorkflowVersion Resource Type. */
export type AwsOmicsWorkflowversion = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:.+$
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 18
   * @pattern ^[0-9]+$
   */
  WorkflowId: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9][A-Za-z0-9\-\._]*$
   */
  VersionName: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  DefinitionUri?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Description?: string;
  Engine?: "WDL" | "NEXTFLOW" | "CWL";
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Main?: string;
  ParameterTemplate?: Record<string, {
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
     */
    Description?: string;
    Optional?: boolean;
  }>;
  Status?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETED" | "FAILED" | "INACTIVE";
  Accelerators?: "GPU";
  StorageType?: "STATIC" | "DYNAMIC";
  /**
   * @minimum 0
   * @maximum 100000
   */
  StorageCapacity?: number;
  Tags?: Record<string, string>;
  Type?: "PRIVATE" | "READY2RUN";
  /**
   * @minLength 1
   * @maxLength 36
   * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
   */
  Uuid?: string;
  /**
   * @minLength 1
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  WorkflowBucketOwnerId?: string;
  /**
   * Path to the primary workflow parameter template JSON file inside the repository
   * @pattern ^[\S]+$
   */
  ParameterTemplatePath?: string;
  DefinitionRepository?: {
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern ^arn:aws(-[\\w]+)*:.+:.+:[0-9]{12}:.+$
     */
    connectionArn?: string;
    /** @pattern .+/.+ */
    fullRepositoryId?: string;
    sourceReference?: {
      /** @enum ["BRANCH","TAG","COMMIT"] */
      type?: "BRANCH" | "TAG" | "COMMIT";
      value?: string;
    };
    /**
     * @minItems 1
     * @maxItems 50
     */
    excludeFilePatterns?: string[];
  };
  /**
   * The path to the workflow README markdown file within the repository. This file provides
   * documentation and usage information for the workflow. If not specified, the README.md file from the
   * root directory of the repository will be used.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  readmePath?: string;
  /**
   * The S3 URI of the README file for the workflow. This file provides documentation and usage
   * information for the workflow. The S3 URI must begin with s3://USER-OWNED-BUCKET/. The requester
   * must have access to the S3 bucket and object. The max README content length is 500 KiB.
   * @pattern ^s3://([a-z0-9][a-z0-9-.]{1,61}[a-z0-9])/((.{1,1024}))$
   */
  readmeUri?: string;
  /**
   * The markdown content for the workflow's README file. This provides documentation and usage
   * information for users of the workflow.
   */
  readmeMarkdown?: string;
  ContainerRegistryMap?: {
    RegistryMappings?: {
      /**
       * @minLength 1
       * @maxLength 750
       * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
       */
      UpstreamRegistryUrl?: string;
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
       */
      EcrRepositoryPrefix?: string;
      /**
       * @minLength 2
       * @maxLength 30
       * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
       */
      UpstreamRepositoryPrefix?: string;
      /**
       * @minLength 12
       * @maxLength 12
       * @pattern ^[0-9]+$
       */
      EcrAccountId?: string;
    }[];
    ImageMappings?: {
      /**
       * @minLength 1
       * @maxLength 750
       * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
       */
      SourceImage?: string;
      /**
       * @minLength 1
       * @maxLength 750
       * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
       */
      DestinationImage?: string;
    }[];
  };
  /**
   * @minLength 1
   * @maxLength 750
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  ContainerRegistryMapUri?: string;
};
