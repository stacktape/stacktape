// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-threatintelset.json

/** Resource Type definition for AWS::GuardDuty::ThreatIntelSet */
export type AwsGuarddutyThreatintelset = {
  Id?: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  Format: string;
  Activate?: boolean;
  /**
   * @minLength 1
   * @maxLength 32
   */
  DetectorId?: string;
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  Location: string;
  ExpectedBucketOwner?: string;
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
