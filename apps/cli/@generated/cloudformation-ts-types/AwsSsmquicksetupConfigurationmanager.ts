// This file is auto-generated. Do not edit manually.
// Source: aws-ssmquicksetup-configurationmanager.json

/** Definition of AWS::SSMQuickSetup::ConfigurationManager Resource Type */
export type AwsSsmquicksetupConfigurationmanager = {
  ConfigurationDefinitions: {
    /** @pattern ^[a-zA-Z0-9_\-.:/]{3,200}$ */
    Type: string;
    Parameters: Record<string, string>;
    /**
     * @minLength 1
     * @maxLength 128
     */
    TypeVersion?: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    LocalDeploymentExecutionRoleName?: string;
    LocalDeploymentAdministrationRoleArn?: string;
    id?: string;
  }[];
  CreatedAt?: string;
  /** @pattern ^.{0,512}$ */
  Description?: string;
  LastModifiedAt?: string;
  ManagerArn?: string;
  /** @pattern ^[ A-Za-z0-9_-]{1,50}$ */
  Name?: string;
  StatusSummaries?: ({
    StatusType: "Deployment" | "AsyncExecutions";
    Status?: "INITIALIZING" | "DEPLOYING" | "SUCCEEDED" | "DELETING" | "STOPPING" | "FAILED" | "STOPPED" | "DELETE_FAILED" | "STOP_FAILED" | "NONE";
    StatusMessage?: string;
    LastUpdatedAt: string;
    StatusDetails?: Record<string, string>;
  })[];
  Tags?: Record<string, string>;
};
