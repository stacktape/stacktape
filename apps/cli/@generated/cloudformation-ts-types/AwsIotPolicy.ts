// This file is auto-generated. Do not edit manually.
// Source: aws-iot-policy.json

/** Resource Type definition for AWS::IoT::Policy */
export type AwsIotPolicy = {
  Id?: string;
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 404600
   */
  PolicyDocument: Record<string, unknown> | string;
  PolicyName?: string;
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
