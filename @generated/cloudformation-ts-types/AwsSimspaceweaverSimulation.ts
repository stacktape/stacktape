// This file is auto-generated. Do not edit manually.
// Source: aws-simspaceweaver-simulation.json

/** AWS::SimSpaceWeaver::Simulation resource creates an AWS Simulation. */
export type AwsSimspaceweaverSimulation = {
  /**
   * The name of the simulation.
   * @minLength 1
   * @maxLength 2048
   * @pattern [a-zA-Z0-9_\-]{1,2048}$
   */
  Name: string;
  /** Role ARN. */
  RoleArn: string;
  SchemaS3Location?: {
    /**
     * The Schema S3 bucket name.
     * @minLength 3
     * @maxLength 63
     * @pattern [a-zA-Z0-9_\-]{3,63}$
     */
    BucketName: string;
    /**
     * This is the schema S3 object key, which includes the full path of "folders" from the bucket root to
     * the schema.
     * @minLength 3
     * @maxLength 255
     */
    ObjectKey: string;
  };
  /** Json object with all simulation details */
  DescribePayload?: string;
  /**
   * The maximum running time of the simulation.
   * @minLength 2
   * @maxLength 6
   */
  MaximumDuration?: string;
  SnapshotS3Location?: {
    /**
     * The Schema S3 bucket name.
     * @minLength 3
     * @maxLength 63
     * @pattern [a-zA-Z0-9_\-]{3,63}$
     */
    BucketName: string;
    /**
     * This is the schema S3 object key, which includes the full path of "folders" from the bucket root to
     * the schema.
     * @minLength 3
     * @maxLength 255
     */
    ObjectKey: string;
  };
};
