// This file is auto-generated. Do not edit manually.
// Source: aws-iam-servicelinkedrole.json

/** Resource Type definition for AWS::IAM::ServiceLinkedRole */
export type AwsIamServicelinkedrole = {
  /** The name of the role. */
  RoleName?: string;
  /**
   * A string that you provide, which is combined with the service-provided prefix to form the complete
   * role name.
   */
  CustomSuffix?: string;
  /** The description of the role. */
  Description?: string;
  /** The service principal for the AWS service to which this role is attached. */
  AWSServiceName?: string;
};
