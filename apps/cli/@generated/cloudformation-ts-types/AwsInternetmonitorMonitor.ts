// This file is auto-generated. Do not edit manually.
// Source: aws-internetmonitor-monitor.json

/**
 * Represents a monitor, which defines the monitoring boundaries for measurements that Internet
 * Monitor publishes information about for an application
 */
export type AwsInternetmonitorMonitor = {
  CreatedAt?: string;
  ModifiedAt?: string;
  /**
   * @minLength 20
   * @maxLength 512
   * @pattern ^arn:.*
   */
  MonitorArn?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  MonitorName: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^(\d{12})$
   */
  LinkedAccountId?: string;
  IncludeLinkedAccounts?: boolean;
  ProcessingStatus?: "OK" | "INACTIVE" | "COLLECTING_DATA" | "INSUFFICIENT_DATA" | "FAULT_SERVICE" | "FAULT_ACCESS_CLOUDWATCH";
  ProcessingStatusInfo?: string;
  Resources?: string[];
  ResourcesToAdd?: string[];
  ResourcesToRemove?: string[];
  Status?: "PENDING" | "ACTIVE" | "INACTIVE" | "ERROR";
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
  /**
   * @minimum 1
   * @maximum 500000
   */
  MaxCityNetworksToMonitor?: number;
  /**
   * @minimum 1
   * @maximum 100
   */
  TrafficPercentageToMonitor?: number;
  InternetMeasurementsLogDelivery?: {
    S3Config?: {
      /** @minLength 3 */
      BucketName?: string;
      BucketPrefix?: string;
      /** @enum ["ENABLED","DISABLED"] */
      LogDeliveryStatus?: "ENABLED" | "DISABLED";
    };
  };
  HealthEventsConfig?: {
    /**
     * @minimum 0
     * @maximum 100
     */
    AvailabilityScoreThreshold?: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    PerformanceScoreThreshold?: number;
    AvailabilityLocalHealthEventsConfig?: {
      /** @enum ["ENABLED","DISABLED"] */
      Status?: "ENABLED" | "DISABLED";
      /**
       * @minimum 0
       * @maximum 100
       */
      HealthScoreThreshold?: number;
      /**
       * @minimum 0
       * @maximum 100
       */
      MinTrafficImpact?: number;
    };
    PerformanceLocalHealthEventsConfig?: {
      /** @enum ["ENABLED","DISABLED"] */
      Status?: "ENABLED" | "DISABLED";
      /**
       * @minimum 0
       * @maximum 100
       */
      HealthScoreThreshold?: number;
      /**
       * @minimum 0
       * @maximum 100
       */
      MinTrafficImpact?: number;
    };
  };
};
