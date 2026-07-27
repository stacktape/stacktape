// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-resourcedatasync.json

/** Resource Type definition for AWS::SSM::ResourceDataSync */
export type AwsSsmResourcedatasync = {
  S3Destination?: {
    /**
     * @minLength 1
     * @maxLength 512
     */
    KMSKeyArn?: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    BucketPrefix?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     */
    BucketName: string;
    /**
     * @minLength 1
     * @maxLength 64
     */
    BucketRegion: string;
    /**
     * @minLength 1
     * @maxLength 1024
     */
    SyncFormat: string;
  };
  /**
   * @minLength 0
   * @maxLength 512
   */
  KMSKeyArn?: string;
  SyncSource?: {
    IncludeFutureRegions?: boolean;
    /** @uniqueItems false */
    SourceRegions: string[];
    /**
     * @minLength 1
     * @maxLength 64
     */
    SourceType: string;
    AwsOrganizationsSource?: {
      /** @uniqueItems false */
      OrganizationalUnits?: string[];
      /**
       * @minLength 1
       * @maxLength 64
       */
      OrganizationSourceType: string;
    };
  };
  /**
   * @minLength 1
   * @maxLength 2048
   */
  BucketName?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  BucketRegion?: string;
  /**
   * @minLength 0
   * @maxLength 1024
   */
  SyncFormat?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  SyncName: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  SyncType?: string;
  /**
   * @minLength 0
   * @maxLength 64
   */
  BucketPrefix?: string;
};
