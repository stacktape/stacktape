// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-loggingconfiguration.json

/** Resource type definition for AWS::NetworkFirewall::LoggingConfiguration */
export type AwsNetworkfirewallLoggingconfiguration = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  FirewallName?: string;
  FirewallArn: string;
  LoggingConfiguration: {
    /** @minItems 1 */
    LogDestinationConfigs: ({
      /** @enum ["ALERT","FLOW","TLS"] */
      LogType: "ALERT" | "FLOW" | "TLS";
      /** @enum ["S3","CloudWatchLogs","KinesisDataFirehose"] */
      LogDestinationType: "S3" | "CloudWatchLogs" | "KinesisDataFirehose";
      /** A key-value pair to configure the logDestinations. */
      LogDestination: Record<string, string>;
    })[];
  };
  EnableMonitoringDashboard?: boolean;
};
