// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-trustedentityset.json

/** Resource Type definition for AWS::GuardDuty::TrustedEntitySet */
export type AwsGuarddutyTrustedentityset = {
  Id?: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  Format: string;
  Activate?: boolean;
  /** @enum ["INACTIVE","ACTIVATING","ACTIVE","DEACTIVATING","ERROR","DELETE_PENDING","DELETED"] */
  Status?: "INACTIVE" | "ACTIVATING" | "ACTIVE" | "DEACTIVATING" | "ERROR" | "DELETE_PENDING" | "DELETED";
  CreatedAt?: string;
  UpdatedAt?: string;
  ErrorDetails?: string;
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
