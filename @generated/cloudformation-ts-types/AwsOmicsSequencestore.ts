// This file is auto-generated. Do not edit manually.
// Source: aws-omics-sequencestore.json

/** Resource Type definition for AWS::Omics::SequenceStore */
export type AwsOmicsSequencestore = {
  /**
   * Location of the access logs.
   * @pattern ^$|^s3://([a-z0-9][a-z0-9-.]{1,61}[a-z0-9])/?((.{1,800})/)?$
   */
  AccessLogLocation?: string;
  /**
   * The store's ARN.
   * @minLength 1
   * @maxLength 127
   * @pattern ^arn:.+$
   */
  Arn?: string;
  /** When the store was created. */
  CreationTime?: string;
  /**
   * A description for the store.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Description?: string;
  ETagAlgorithmFamily?: "MD5up" | "SHA256up" | "SHA512up";
  /**
   * An S3 location that is used to store files that have failed a direct upload.
   * @minLength 0
   * @pattern ^$|^s3://([a-z0-9][a-z0-9-.]{1,61}[a-z0-9])/?((.{1,1024})/)?$
   */
  FallbackLocation?: string;
  /**
   * A name for the store.
   * @minLength 1
   * @maxLength 127
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Name: string;
  /**
   * The tags keys to propagate to the S3 objects associated with read sets in the sequence store.
   * @minItems 0
   * @maxItems 50
   */
  PropagatedSetLevelTags?: string[];
  /**
   * This is ARN of the access point associated with the S3 bucket storing read sets.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^arn:[^:]*:s3:[^:]*:[^:]*:accesspoint/.*$
   */
  S3AccessPointArn?: string;
  /** The resource policy that controls S3 access on the store */
  S3AccessPolicy?: Record<string, unknown>;
  /**
   * The S3 URI of the sequence store.
   * @pattern ^s3://([a-z0-9][a-z0-9-.]{1,61}[a-z0-9])/(.{1,1024})$
   */
  S3Uri?: string;
  /**
   * @minLength 10
   * @maxLength 36
   * @pattern ^[0-9]+$
   */
  SequenceStoreId?: string;
  SseConfig?: {
    Type: "KMS";
    /**
     * An encryption key ARN.
     * @minLength 20
     * @maxLength 2048
     * @pattern arn:([^:
]*):([^:
]*):([^:
]*):([0-9]{12}):([^:
]*)
     */
    KeyArn?: string;
  };
  Status?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETING" | "FAILED";
  /**
   * The status message of the sequence store.
   * @minLength 1
   * @maxLength 127
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  StatusMessage?: string;
  Tags?: Record<string, string>;
  /** The last-updated time of the sequence store. */
  UpdateTime?: string;
};
