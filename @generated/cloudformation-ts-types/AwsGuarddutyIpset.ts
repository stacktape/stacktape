// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-ipset.json

/** Resource Type definition for AWS::GuardDuty::IPSet */
export type AwsGuarddutyIpset = {
  Id?: string;
  Format: string;
  Activate?: boolean;
  /**
   * @minLength 1
   * @maxLength 300
   */
  DetectorId?: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
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
