// This file is auto-generated. Do not edit manually.
// Source: aws-connect-contactflowversion.json

/** Resource Type Definition for ContactFlowVersion */
export type AwsConnectContactflowversion = {
  /**
   * The identifier of the contact flow version (ARN).
   * @minLength 1
   * @maxLength 500
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]+:[0-9]{12}:instance/[-a-zA-Z0-9]+/contact-flow/[-a-zA-Z0-9]+:[0-9]+$
   */
  ContactFlowVersionARN?: string;
  /**
   * The ARN of the contact flow this version is tied to.
   * @minLength 1
   * @maxLength 500
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]+:[0-9]{12}:instance/[-a-zA-Z0-9]+/contact-flow/[-a-zA-Z0-9]+$
   */
  ContactFlowId: string;
  /** The version number of this revision */
  Version?: number;
  /**
   * The description of the version.
   * @maxLength 500
   */
  Description?: string;
  /**
   * Indicates the checksum value of the latest published flow content
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9]{64}$
   */
  FlowContentSha256?: string;
};
