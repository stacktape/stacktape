// This file is auto-generated. Do not edit manually.
// Source: aws-fis-experimenttemplate.json

/** Resource schema for AWS::FIS::ExperimentTemplate */
export type AwsFisExperimenttemplate = {
  Id?: string;
  Description: string;
  Targets: Record<string, {
    ResourceType: string;
    ResourceArns?: string[];
    ResourceTags?: Record<string, string>;
    Parameters?: Record<string, string>;
    Filters?: {
      Path: string;
      Values: string[];
    }[];
    SelectionMode: string;
  }>;
  Actions?: Record<string, {
    ActionId: string;
    Description?: string;
    /** The parameters for the action, if applicable. */
    Parameters?: Record<string, string>;
    /** One or more targets for the action. */
    Targets?: Record<string, string>;
    StartAfter?: string[];
  }>;
  StopConditions: {
    Source: string;
    Value?: string;
  }[];
  LogConfiguration?: {
    CloudWatchLogsConfiguration?: {
      /**
       * @minLength 20
       * @maxLength 2048
       */
      LogGroupArn: string;
    };
    S3Configuration?: {
      /**
       * @minLength 3
       * @maxLength 63
       */
      BucketName: string;
      /**
       * @minLength 1
       * @maxLength 700
       */
      Prefix?: string;
    };
    /** @minimum 1 */
    LogSchemaVersion: number;
  };
  RoleArn: string;
  Tags?: Record<string, string>;
  ExperimentOptions?: {
    /**
     * The account targeting setting for the experiment template.
     * @enum ["multi-account","single-account"]
     */
    AccountTargeting?: "multi-account" | "single-account";
    /**
     * The target resolution failure mode for the experiment template.
     * @enum ["fail","skip"]
     */
    EmptyTargetResolutionMode?: "fail" | "skip";
  };
  ExperimentReportConfiguration?: {
    Outputs: {
      ExperimentReportS3Configuration: {
        /**
         * @minLength 3
         * @maxLength 63
         */
        BucketName: string;
        /**
         * @minLength 1
         * @maxLength 256
         */
        Prefix?: string;
      };
    };
    DataSources?: {
      CloudWatchDashboards?: {
        /**
         * @minLength 1
         * @maxLength 512
         */
        DashboardIdentifier: string;
      }[];
    };
    PreExperimentDuration?: string;
    PostExperimentDuration?: string;
  };
};
