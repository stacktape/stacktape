// This file is auto-generated. Do not edit manually.
// Source: aws-iot-softwarepackageversion.json

/** resource definition */
export type AwsIotSoftwarepackageversion = {
  Attributes?: Record<string, string>;
  Artifact?: {
    S3Location: {
      /**
       * The S3 bucket
       * @minLength 1
       */
      Bucket: string;
      /**
       * The S3 key
       * @minLength 1
       */
      Key: string;
      /** The S3 version */
      Version: string;
    };
  };
  /**
   * @minLength 0
   * @maxLength 1024
   * @pattern ^[^\p{C}]+$
   */
  Description?: string;
  ErrorReason?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_.]+$
   */
  PackageName: string;
  /** @pattern ^arn:[!-~]+$ */
  PackageVersionArn?: string;
  /** The inline json job document associated with a software package version */
  Recipe?: string;
  Sbom?: {
    S3Location: {
      /**
       * The S3 bucket
       * @minLength 1
       */
      Bucket: string;
      /**
       * The S3 key
       * @minLength 1
       */
      Key: string;
      /** The S3 version */
      Version: string;
    };
  };
  SbomValidationStatus?: "IN_PROGRESS" | "FAILED" | "SUCCEEDED" | "";
  Status?: "DRAFT" | "PUBLISHED" | "DEPRECATED";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-_.]+$
   */
  VersionName?: string;
};
