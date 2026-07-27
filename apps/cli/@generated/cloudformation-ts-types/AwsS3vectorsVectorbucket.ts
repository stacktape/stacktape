// This file is auto-generated. Do not edit manually.
// Source: aws-s3vectors-vectorbucket.json

/** Resource Type definition for AWS::S3Vectors::VectorBucket */
export type AwsS3vectorsVectorbucket = {
  VectorBucketName?: string;
  VectorBucketArn?: string;
  CreationTime?: string;
  EncryptionConfiguration?: {
    /**
     * The server-side encryption type to use for the encryption configuration of the vector bucket. By
     * default, if you don't specify, all new vectors in Amazon S3 vector buckets use server-side
     * encryption with Amazon S3 managed keys (SSE-S3), specifically AES256.
     * @default "AES256"
     * @enum ["AES256","aws:kms"]
     */
    SseType?: "AES256" | "aws:kms";
    /**
     * AWS Key Management Service (KMS) customer managed key ID to use for the encryption configuration.
     * This parameter is allowed if and only if sseType is set to aws:kms
     * @minLength 1
     * @maxLength 2048
     * @pattern ^(arn:aws[-a-z0-9]*:kms:[-a-z0-9]*:[0-9]{12}:key/.+)$
     */
    KmsKeyArn?: string;
  };
};
