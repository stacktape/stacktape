// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-inputsecuritygroup.json

/** Resource Type definition for AWS::MediaLive::InputSecurityGroup */
export type AwsMedialiveInputsecuritygroup = {
  Id?: string;
  Arn?: string;
  /** @uniqueItems false */
  WhitelistRules?: {
    Cidr?: string;
  }[];
  Tags?: Record<string, unknown>;
};
