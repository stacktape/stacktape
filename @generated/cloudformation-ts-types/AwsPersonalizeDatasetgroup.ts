// This file is auto-generated. Do not edit manually.
// Source: aws-personalize-datasetgroup.json

/** Resource Schema for AWS::Personalize::DatasetGroup. */
export type AwsPersonalizeDatasetgroup = {
  /**
   * The Amazon Resource Name (ARN) of the dataset group.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  DatasetGroupArn?: string;
  /**
   * The name for the new dataset group.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  Name: string;
  /**
   * The Amazon Resource Name(ARN) of a AWS Key Management Service (KMS) key used to encrypt the
   * datasets.
   * @maxLength 2048
   * @pattern arn:aws.*:kms:.*:[0-9]{12}:key/.*
   */
  KmsKeyArn?: string;
  /**
   * The ARN of the AWS Identity and Access Management (IAM) role that has permissions to access the AWS
   * Key Management Service (KMS) key. Supplying an IAM role is only valid when also specifying a KMS
   * key.
   * @minLength 0
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
   */
  RoleArn?: string;
  /**
   * The domain of a Domain dataset group.
   * @enum ["ECOMMERCE","VIDEO_ON_DEMAND"]
   */
  Domain?: "ECOMMERCE" | "VIDEO_ON_DEMAND";
};
