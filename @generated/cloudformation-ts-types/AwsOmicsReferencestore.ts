// This file is auto-generated. Do not edit manually.
// Source: aws-omics-referencestore.json

/** Definition of AWS::Omics::ReferenceStore Resource Type */
export type AwsOmicsReferencestore = {
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
  /**
   * A name for the store.
   * @minLength 1
   * @maxLength 127
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Name: string;
  /**
   * @minLength 10
   * @maxLength 36
   * @pattern ^[0-9]+$
   */
  ReferenceStoreId?: string;
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
  Tags?: Record<string, string>;
};
