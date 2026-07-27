// This file is auto-generated. Do not edit manually.
// Source: aws-s3-storagelensgroup.json

/**
 * The AWS::S3::StorageLensGroup resource is an Amazon S3 resource type that you can use to create
 * Storage Lens Group.
 */
export type AwsS3Storagelensgroup = {
  Name: string;
  Filter: {
    MatchAnyPrefix?: string[];
    MatchAnySuffix?: string[];
    MatchAnyTag?: {
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
    MatchObjectSize?: {
      /**
       * Minimum object size to which the rule applies.
       * @minimum 1
       */
      BytesGreaterThan?: number;
      /**
       * Maximum object size to which the rule applies.
       * @minimum 1
       */
      BytesLessThan?: number;
    };
    MatchObjectAge?: {
      /**
       * Minimum object age to which the rule applies.
       * @minimum 1
       */
      DaysGreaterThan?: number;
      /**
       * Maximum object age to which the rule applies.
       * @minimum 1
       */
      DaysLessThan?: number;
    };
    And?: {
      MatchAnyPrefix?: string[];
      MatchAnySuffix?: string[];
      MatchAnyTag?: {
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
      MatchObjectSize?: {
        /**
         * Minimum object size to which the rule applies.
         * @minimum 1
         */
        BytesGreaterThan?: number;
        /**
         * Maximum object size to which the rule applies.
         * @minimum 1
         */
        BytesLessThan?: number;
      };
      MatchObjectAge?: {
        /**
         * Minimum object age to which the rule applies.
         * @minimum 1
         */
        DaysGreaterThan?: number;
        /**
         * Maximum object age to which the rule applies.
         * @minimum 1
         */
        DaysLessThan?: number;
      };
    };
    Or?: {
      MatchAnyPrefix?: string[];
      MatchAnySuffix?: string[];
      MatchAnyTag?: {
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
      MatchObjectSize?: {
        /**
         * Minimum object size to which the rule applies.
         * @minimum 1
         */
        BytesGreaterThan?: number;
        /**
         * Maximum object size to which the rule applies.
         * @minimum 1
         */
        BytesLessThan?: number;
      };
      MatchObjectAge?: {
        /**
         * Minimum object age to which the rule applies.
         * @minimum 1
         */
        DaysGreaterThan?: number;
        /**
         * Maximum object age to which the rule applies.
         * @minimum 1
         */
        DaysLessThan?: number;
      };
    };
  };
  /** The ARN for the Amazon S3 Storage Lens Group. */
  StorageLensGroupArn?: string;
  /**
   * A set of tags (key-value pairs) for this Amazon S3 Storage Lens Group.
   * @uniqueItems false
   */
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
