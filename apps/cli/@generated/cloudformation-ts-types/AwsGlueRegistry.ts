// This file is auto-generated. Do not edit manually.
// Source: aws-glue-registry.json

/** This resource creates a Registry for authoring schemas as part of Glue Schema Registry. */
export type AwsGlueRegistry = {
  /**
   * Amazon Resource Name for the created Registry.
   * @pattern arn:aws(-(cn|us-gov|iso(-[bef])?))?:glue:.*
   */
  Arn?: string;
  /**
   * Name of the registry to be created of max length of 255, and may only contain letters, numbers,
   * hyphen, underscore, dollar sign, or hash mark.  No whitespace.
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * A description of the registry. If description is not provided, there will not be any default value
   * for this.
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  /**
   * List of tags to tag the Registry
   * @minItems 0
   * @maxItems 10
   */
  Tags?: {
    /**
     * A key to identify the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Corresponding tag value for the key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
