// This file is auto-generated. Do not edit manually.
// Source: aws-kafkaconnect-customplugin.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsKafkaconnectCustomplugin = {
  /**
   * The name of the custom plugin.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  /**
   * A summary description of the custom plugin.
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The Amazon Resource Name (ARN) of the custom plugin to use.
   * @pattern arn:(aws|aws-us-gov|aws-cn):kafkaconnect:.*
   */
  CustomPluginArn?: string;
  /**
   * The type of the plugin file.
   * @enum ["JAR","ZIP"]
   */
  ContentType: "JAR" | "ZIP";
  FileDescription?: {
    /** The hex-encoded MD5 checksum of the custom plugin file. You can use it to validate the file. */
    FileMd5?: string;
    /** The size in bytes of the custom plugin file. You can use it to validate the file. */
    FileSize?: number;
  };
  Location: {
    S3Location: {
      /** The Amazon Resource Name (ARN) of an S3 bucket. */
      BucketArn: string;
      /** The file key for an object in an S3 bucket. */
      FileKey: string;
      /** The version of an object in an S3 bucket. */
      ObjectVersion?: string;
    };
  };
  /** The revision of the custom plugin. */
  Revision?: number;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
