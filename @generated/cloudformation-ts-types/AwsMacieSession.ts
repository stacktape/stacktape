// This file is auto-generated. Do not edit manually.
// Source: aws-macie-session.json

/**
 * The AWS::Macie::Session resource specifies a new Amazon Macie session. A session is an object that
 * represents the Amazon Macie service. A session is required for Amazon Macie to become operational.
 */
export type AwsMacieSession = {
  /** AWS account ID of customer */
  AwsAccountId?: string;
  /**
   * A enumeration value that specifies the status of the Macie Session.
   * @default "ENABLED"
   * @enum ["ENABLED","PAUSED"]
   */
  Status?: "ENABLED" | "PAUSED";
  /**
   * A enumeration value that specifies how frequently finding updates are published.
   * @default "SIX_HOURS"
   * @enum ["FIFTEEN_MINUTES","ONE_HOUR","SIX_HOURS"]
   */
  FindingPublishingFrequency?: "FIFTEEN_MINUTES" | "ONE_HOUR" | "SIX_HOURS";
  /** Service role used by Macie */
  ServiceRole?: string;
  /**
   * The status of automated sensitive data discovery for the Macie session.
   * @enum ["ENABLED","DISABLED"]
   */
  AutomatedDiscoveryStatus?: "ENABLED" | "DISABLED";
};
