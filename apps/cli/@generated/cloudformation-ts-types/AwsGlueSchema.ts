// This file is auto-generated. Do not edit manually.
// Source: aws-glue-schema.json

/** This resource represents a schema of Glue Schema Registry. */
export type AwsGlueSchema = {
  /**
   * Amazon Resource Name for the Schema.
   * @pattern arn:aws(-(cn|us-gov|iso(-[bef])?))?:glue:.*
   */
  Arn?: string;
  Registry?: {
    /**
     * Name of the registry in which the schema will be created.
     * @minLength 1
     * @maxLength 255
     */
    Name?: string;
    /**
     * Amazon Resource Name for the Registry.
     * @pattern arn:aws(-(cn|us-gov|iso(-[bef])?))?:glue:.*
     */
    Arn?: string;
  };
  /**
   * Name of the schema.
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * A description of the schema. If description is not provided, there will not be any default value
   * for this.
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  /**
   * Data format name to use for the schema. Accepted values: 'AVRO', 'JSON', 'PROTOBUF'
   * @enum ["AVRO","JSON","PROTOBUF"]
   */
  DataFormat: "AVRO" | "JSON" | "PROTOBUF";
  /**
   * Compatibility setting for the schema.
   * @enum ["NONE","DISABLED","BACKWARD","BACKWARD_ALL","FORWARD","FORWARD_ALL","FULL","FULL_ALL"]
   */
  Compatibility: "NONE" | "DISABLED" | "BACKWARD" | "BACKWARD_ALL" | "FORWARD" | "FORWARD_ALL" | "FULL" | "FULL_ALL";
  /**
   * Definition for the initial schema version in plain-text.
   * @minLength 1
   * @maxLength 170000
   */
  SchemaDefinition?: string;
  CheckpointVersion?: {
    /** Indicates if the latest version needs to be updated. */
    IsLatest?: boolean;
    /**
     * Indicates the version number in the schema to update.
     * @minimum 1
     * @maximum 100000
     */
    VersionNumber?: number;
  };
  /**
   * List of tags to tag the schema
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
  /**
   * Represents the version ID associated with the initial schema version.
   * @pattern [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
   */
  InitialSchemaVersionId?: string;
};
