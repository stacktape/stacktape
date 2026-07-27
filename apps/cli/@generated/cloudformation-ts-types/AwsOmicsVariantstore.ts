// This file is auto-generated. Do not edit manually.
// Source: aws-omics-variantstore.json

/** Definition of AWS::Omics::VariantStore Resource Type */
export type AwsOmicsVariantstore = {
  CreationTime?: string;
  /**
   * @minLength 0
   * @maxLength 500
   */
  Description?: string;
  /** @pattern ^[a-f0-9]{12}$ */
  Id?: string;
  /** @pattern ^([a-z]){1}([a-z0-9_]){2,254} */
  Name: string;
  Reference: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern ^arn:.+$
     */
    ReferenceArn: string;
  };
  SseConfig?: {
    Type: "KMS";
    /**
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
  Status?: "CREATING" | "UPDATING" | "DELETING" | "ACTIVE" | "FAILED";
  /**
   * @minLength 0
   * @maxLength 1000
   */
  StatusMessage?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:([^:
]*):([^:
]*):([^:
]*):([0-9]{12}):([^:
]*)$
   */
  StoreArn?: string;
  StoreSizeBytes?: number;
  Tags?: Record<string, string>;
  UpdateTime?: string;
};
