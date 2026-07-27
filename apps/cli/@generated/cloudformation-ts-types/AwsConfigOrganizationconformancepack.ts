// This file is auto-generated. Do not edit manually.
// Source: aws-config-organizationconformancepack.json

/** Resource schema for AWS::Config::OrganizationConformancePack. */
export type AwsConfigOrganizationconformancepack = {
  /**
   * The name of the organization conformance pack.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z][-a-zA-Z0-9]*
   */
  OrganizationConformancePackName: string;
  /**
   * Location of file containing the template body.
   * @minLength 1
   * @maxLength 1024
   * @pattern s3://.*
   */
  TemplateS3Uri?: string;
  /**
   * A string containing full conformance pack template body.
   * @minLength 1
   * @maxLength 51200
   */
  TemplateBody?: string;
  /**
   * AWS Config stores intermediate files while processing conformance pack template.
   * @minLength 0
   * @maxLength 63
   */
  DeliveryS3Bucket?: string;
  /**
   * The prefix for the delivery S3 bucket.
   * @minLength 0
   * @maxLength 1024
   */
  DeliveryS3KeyPrefix?: string;
  /**
   * A list of ConformancePackInputParameter objects.
   * @minItems 0
   * @maxItems 60
   */
  ConformancePackInputParameters?: {
    ParameterName: string;
    ParameterValue: string;
  }[];
  /**
   * A list of AWS accounts to be excluded from an organization conformance pack while deploying a
   * conformance pack.
   * @minItems 0
   * @maxItems 1000
   */
  ExcludedAccounts?: string[];
};
