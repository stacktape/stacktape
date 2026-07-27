// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-enclavecertificateiamroleassociation.json

/**
 * Associates an AWS Identity and Access Management (IAM) role with an AWS Certificate Manager (ACM)
 * certificate. This association is based on Amazon Resource Names and it enables the certificate to
 * be used by the ACM for Nitro Enclaves application inside an enclave.
 */
export type AwsEc2Enclavecertificateiamroleassociation = {
  /**
   * The Amazon Resource Name (ARN) of the ACM certificate with which to associate the IAM role.
   * @minLength 1
   * @maxLength 1283
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:acm:[A-Za-z0-9-]{1,64}:([0-9]{12})?:certificate/.+$
   */
  CertificateArn: string;
  /**
   * The Amazon Resource Name (ARN) of the IAM role to associate with the ACM certificate. You can
   * associate up to 16 IAM roles with an ACM certificate.
   * @minLength 1
   * @maxLength 1283
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:iam:.*:([0-9]{12})?:role/.+$
   */
  RoleArn: string;
  /** The name of the Amazon S3 bucket to which the certificate was uploaded. */
  CertificateS3BucketName?: string;
  /**
   * The Amazon S3 object key where the certificate, certificate chain, and encrypted private key bundle
   * are stored.
   */
  CertificateS3ObjectKey?: string;
  /** The ID of the AWS KMS CMK used to encrypt the private key of the certificate. */
  EncryptionKmsKeyId?: string;
};
