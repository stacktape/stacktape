// This file is auto-generated. Do not edit manually.
// Source: aws-omics-annotationstore.json

/** Definition of AWS::Omics::AnnotationStore Resource Type */
export type AwsOmicsAnnotationstore = {
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
  Reference?: {
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
  StoreFormat: "GFF" | "TSV" | "VCF";
  StoreOptions?: {
    TsvStoreOptions: {
      AnnotationType?: "GENERIC" | "CHR_POS" | "CHR_POS_REF_ALT" | "CHR_START_END_ONE_BASE" | "CHR_START_END_REF_ALT_ONE_BASE" | "CHR_START_END_ZERO_BASE" | "CHR_START_END_REF_ALT_ZERO_BASE";
      FormatToHeader?: Record<string, string>;
      /**
       * @minItems 1
       * @maxItems 5000
       */
      Schema?: (Record<string, "LONG" | "INT" | "STRING" | "FLOAT" | "DOUBLE" | "BOOLEAN">)[];
    };
  };
  StoreSizeBytes?: number;
  Tags?: Record<string, string>;
  UpdateTime?: string;
};
