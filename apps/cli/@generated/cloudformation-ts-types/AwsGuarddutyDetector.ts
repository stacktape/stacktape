// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-detector.json

/** Resource Type definition for AWS::GuardDuty::Detector */
export type AwsGuarddutyDetector = {
  FindingPublishingFrequency?: string;
  Enable: boolean;
  DataSources?: {
    S3Logs?: {
      Enable: boolean;
    };
    Kubernetes?: {
      AuditLogs: {
        Enable: boolean;
      };
    };
    MalwareProtection?: {
      ScanEc2InstanceWithFindings?: {
        EbsVolumes?: boolean;
      };
    };
  };
  Features?: ({
    /** @maxLength 128 */
    Name: string;
    /** @enum ["ENABLED","DISABLED"] */
    Status: "ENABLED" | "DISABLED";
    AdditionalConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      Name?: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Status?: string;
    }[];
  })[];
  Id?: string;
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
