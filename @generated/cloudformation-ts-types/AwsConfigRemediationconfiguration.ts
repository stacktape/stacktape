// This file is auto-generated. Do not edit manually.
// Source: aws-config-remediationconfiguration.json

/** Resource Type definition for AWS::Config::RemediationConfiguration */
export type AwsConfigRemediationconfiguration = {
  TargetVersion?: string;
  ExecutionControls?: {
    SsmControls?: {
      ErrorPercentage?: number;
      ConcurrentExecutionRatePercentage?: number;
    };
  };
  Parameters?: Record<string, unknown>;
  TargetType: string;
  ConfigRuleName: string;
  ResourceType?: string;
  RetryAttemptSeconds?: number;
  MaximumAutomaticAttempts?: number;
  Id?: string;
  TargetId: string;
  Automatic?: boolean;
};
