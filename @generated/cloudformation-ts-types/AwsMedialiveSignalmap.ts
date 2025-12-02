// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-signalmap.json

/** Definition of AWS::MediaLive::SignalMap Resource Type */
export type AwsMedialiveSignalmap = {
  /**
   * A signal map's ARN (Amazon Resource Name)
   * @pattern ^arn:.+:medialive:.+:signal-map:.+$
   */
  Arn?: string;
  CloudWatchAlarmTemplateGroupIdentifiers?: string[];
  CloudWatchAlarmTemplateGroupIds?: string[];
  CreatedAt?: string;
  /**
   * A resource's optional description.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * A top-level supported AWS resource ARN to discovery a signal map from.
   * @minLength 1
   * @maxLength 2048
   */
  DiscoveryEntryPointArn: string;
  /**
   * Error message associated with a failed creation or failed update attempt of a signal map.
   * @minLength 0
   * @maxLength 2048
   */
  ErrorMessage?: string;
  EventBridgeRuleTemplateGroupIdentifiers?: string[];
  EventBridgeRuleTemplateGroupIds?: string[];
  FailedMediaResourceMap?: Record<string, {
    Destinations?: {
      /**
       * The ARN of a resource used in AWS media workflows.
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn.+$
       */
      Arn: string;
      /**
       * The logical name of an AWS media resource.
       * @minLength 0
       * @maxLength 256
       */
      Name?: string;
    }[];
    /**
     * The logical name of an AWS media resource.
     * @minLength 0
     * @maxLength 256
     */
    Name?: string;
    Sources?: {
      /**
       * The ARN of a resource used in AWS media workflows.
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn.+$
       */
      Arn: string;
      /**
       * The logical name of an AWS media resource.
       * @minLength 0
       * @maxLength 256
       */
      Name?: string;
    }[];
  }>;
  /**
   * If true, will force a rediscovery of a signal map if an unchanged discoveryEntryPointArn is
   * provided.
   * @default false
   */
  ForceRediscovery?: boolean;
  /**
   * A signal map's id.
   * @minLength 7
   * @maxLength 11
   * @pattern ^(aws-)?[0-9]{7}$
   */
  Id?: string;
  Identifier?: string;
  LastDiscoveredAt?: string;
  LastSuccessfulMonitorDeployment?: {
    /**
     * URI associated with a signal map's monitor deployment.
     * @minLength 0
     * @maxLength 2048
     */
    DetailsUri: string;
    Status: "NOT_DEPLOYED" | "DRY_RUN_DEPLOYMENT_COMPLETE" | "DRY_RUN_DEPLOYMENT_FAILED" | "DRY_RUN_DEPLOYMENT_IN_PROGRESS" | "DEPLOYMENT_COMPLETE" | "DEPLOYMENT_FAILED" | "DEPLOYMENT_IN_PROGRESS" | "DELETE_COMPLETE" | "DELETE_FAILED" | "DELETE_IN_PROGRESS";
  };
  MediaResourceMap?: Record<string, {
    Destinations?: {
      /**
       * The ARN of a resource used in AWS media workflows.
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn.+$
       */
      Arn: string;
      /**
       * The logical name of an AWS media resource.
       * @minLength 0
       * @maxLength 256
       */
      Name?: string;
    }[];
    /**
     * The logical name of an AWS media resource.
     * @minLength 0
     * @maxLength 256
     */
    Name?: string;
    Sources?: {
      /**
       * The ARN of a resource used in AWS media workflows.
       * @minLength 1
       * @maxLength 2048
       * @pattern ^arn.+$
       */
      Arn: string;
      /**
       * The logical name of an AWS media resource.
       * @minLength 0
       * @maxLength 256
       */
      Name?: string;
    }[];
  }>;
  ModifiedAt?: string;
  /**
   * If true, there are pending monitor changes for this signal map that can be deployed.
   * @default false
   */
  MonitorChangesPendingDeployment?: boolean;
  MonitorDeployment?: {
    /**
     * URI associated with a signal map's monitor deployment.
     * @minLength 0
     * @maxLength 2048
     */
    DetailsUri?: string;
    /**
     * Error message associated with a failed monitor deployment of a signal map.
     * @minLength 0
     * @maxLength 2048
     */
    ErrorMessage?: string;
    Status: "NOT_DEPLOYED" | "DRY_RUN_DEPLOYMENT_COMPLETE" | "DRY_RUN_DEPLOYMENT_FAILED" | "DRY_RUN_DEPLOYMENT_IN_PROGRESS" | "DEPLOYMENT_COMPLETE" | "DEPLOYMENT_FAILED" | "DEPLOYMENT_IN_PROGRESS" | "DELETE_COMPLETE" | "DELETE_FAILED" | "DELETE_IN_PROGRESS";
  };
  /**
   * A resource's name. Names must be unique within the scope of a resource type in a specific region.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[^\s]+$
   */
  Name: string;
  Status?: "CREATE_IN_PROGRESS" | "CREATE_COMPLETE" | "CREATE_FAILED" | "UPDATE_IN_PROGRESS" | "UPDATE_COMPLETE" | "UPDATE_REVERTED" | "UPDATE_FAILED" | "READY" | "NOT_READY";
  Tags?: Record<string, string>;
};
