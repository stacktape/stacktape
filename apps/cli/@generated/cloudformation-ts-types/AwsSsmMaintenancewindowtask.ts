// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-maintenancewindowtask.json

/** Resource Type definition for AWS::SSM::MaintenanceWindowTask */
export type AwsSsmMaintenancewindowtask = {
  MaxErrors?: string;
  Description?: string;
  ServiceRoleArn?: string;
  Priority: number;
  MaxConcurrency?: string;
  /** @uniqueItems false */
  Targets?: {
    /** @uniqueItems false */
    Values: string[];
    Key: string;
  }[];
  Name?: string;
  TaskArn: string;
  TaskInvocationParameters?: {
    MaintenanceWindowStepFunctionsParameters?: {
      Input?: string;
      Name?: string;
    };
    MaintenanceWindowRunCommandParameters?: {
      TimeoutSeconds?: number;
      Comment?: string;
      OutputS3KeyPrefix?: string;
      Parameters?: Record<string, unknown>;
      CloudWatchOutputConfig?: {
        CloudWatchOutputEnabled?: boolean;
        CloudWatchLogGroupName?: string;
      };
      DocumentHashType?: string;
      ServiceRoleArn?: string;
      NotificationConfig?: {
        /** @uniqueItems false */
        NotificationEvents?: string[];
        NotificationArn: string;
        NotificationType?: string;
      };
      DocumentVersion?: string;
      OutputS3BucketName?: string;
      DocumentHash?: string;
    };
    MaintenanceWindowLambdaParameters?: {
      Qualifier?: string;
      Payload?: string;
      ClientContext?: string;
    };
    MaintenanceWindowAutomationParameters?: {
      Parameters?: Record<string, unknown>;
      DocumentVersion?: string;
    };
  };
  WindowId: string;
  TaskParameters?: Record<string, unknown>;
  TaskType: string;
  CutoffBehavior?: string;
  Id?: string;
  LoggingInfo?: {
    Region: string;
    S3Prefix?: string;
    S3Bucket: string;
  };
};
