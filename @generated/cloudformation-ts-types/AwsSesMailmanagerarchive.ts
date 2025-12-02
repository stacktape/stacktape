// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanagerarchive.json

/** Definition of AWS::SES::MailManagerArchive Resource Type */
export type AwsSesMailmanagerarchive = {
  ArchiveArn?: string;
  /**
   * @minLength 1
   * @maxLength 66
   */
  ArchiveId?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$
   */
  ArchiveName?: string;
  ArchiveState?: "ACTIVE" | "PENDING_DELETION";
  /** @pattern ^arn:aws(|-cn|-us-gov):kms:[a-z0-9-]{1,20}:[0-9]{12}:(key|alias)/.+$ */
  KmsKeyArn?: string;
  Retention?: {
    RetentionPeriod: "THREE_MONTHS" | "SIX_MONTHS" | "NINE_MONTHS" | "ONE_YEAR" | "EIGHTEEN_MONTHS" | "TWO_YEARS" | "THIRTY_MONTHS" | "THREE_YEARS" | "FOUR_YEARS" | "FIVE_YEARS" | "SIX_YEARS" | "SEVEN_YEARS" | "EIGHT_YEARS" | "NINE_YEARS" | "TEN_YEARS" | "PERMANENT";
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]*$
     */
    Value: string;
  }[];
};
