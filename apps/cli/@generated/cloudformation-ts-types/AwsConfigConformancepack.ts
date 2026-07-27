// This file is auto-generated. Do not edit manually.
// Source: aws-config-conformancepack.json

/**
 * A conformance pack is a collection of AWS Config rules and remediation actions that can be easily
 * deployed as a single entity in an account and a region or across an entire AWS Organization.
 */
export type AwsConfigConformancepack = {
  /**
   * Name of the conformance pack which will be assigned as the unique identifier.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z][-a-zA-Z0-9]*
   */
  ConformancePackName: string;
  /**
   * AWS Config stores intermediate files while processing conformance pack template.
   * @minLength 0
   * @maxLength 63
   */
  DeliveryS3Bucket?: string;
  /**
   * The prefix for delivery S3 bucket.
   * @minLength 0
   * @maxLength 1024
   */
  DeliveryS3KeyPrefix?: string;
  /**
   * A string containing full conformance pack template body. You can only specify one of the template
   * body or template S3Uri fields.
   * @minLength 1
   * @maxLength 51200
   */
  TemplateBody?: string;
  /**
   * Location of file containing the template body which points to the conformance pack template that is
   * located in an Amazon S3 bucket. You can only specify one of the template body or template S3Uri
   * fields.
   * @minLength 1
   * @maxLength 1024
   * @pattern s3://.*
   */
  TemplateS3Uri?: string;
  /**
   * The TemplateSSMDocumentDetails object contains the name of the SSM document and the version of the
   * SSM document.
   */
  TemplateSSMDocumentDetails?: {
    /**
     * @minLength 3
     * @maxLength 128
     */
    DocumentName?: string;
    /**
     * @minLength 1
     * @maxLength 128
     */
    DocumentVersion?: string;
  };
  /**
   * A list of ConformancePackInputParameter objects.
   * @minItems 0
   * @maxItems 60
   */
  ConformancePackInputParameters?: {
    ParameterName: string;
    ParameterValue: string;
  }[];
};
