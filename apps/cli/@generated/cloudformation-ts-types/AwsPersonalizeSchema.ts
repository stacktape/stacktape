// This file is auto-generated. Do not edit manually.
// Source: aws-personalize-schema.json

/** Resource schema for AWS::Personalize::Schema. */
export type AwsPersonalizeSchema = {
  /**
   * Name for the schema.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  Name: string;
  /**
   * Arn for the schema.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  SchemaArn?: string;
  /**
   * A schema in Avro JSON format.
   * @maxLength 10000
   */
  Schema: string;
  /**
   * The domain of a Domain dataset group.
   * @enum ["ECOMMERCE","VIDEO_ON_DEMAND"]
   */
  Domain?: "ECOMMERCE" | "VIDEO_ON_DEMAND";
};
