// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-resourcepolicy.json

/** Resource Type definition for AWS::SMSVOICE::ResourcePolicy */
export type AwsSmsvoiceResourcepolicy = {
  /**
   * The Amazon Resource Name (ARN) of the AWS End User Messaging SMS and Voice resource to attach the
   * resource-based policy to.
   * @pattern ^arn:\S+$
   */
  ResourceArn: string;
  /** The JSON formatted resource-based policy to attach. */
  PolicyDocument: Record<string, unknown>;
};
