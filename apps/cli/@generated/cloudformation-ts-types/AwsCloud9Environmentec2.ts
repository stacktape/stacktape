// This file is auto-generated. Do not edit manually.
// Source: aws-cloud9-environmentec2.json

/** Resource Type definition for AWS::Cloud9::EnvironmentEC2 */
export type AwsCloud9Environmentec2 = {
  /** @uniqueItems false */
  Repositories?: {
    RepositoryUrl: string;
    PathComponent: string;
  }[];
  OwnerArn?: string;
  Description?: string;
  ConnectionType?: string;
  AutomaticStopTimeMinutes?: number;
  ImageId: string;
  SubnetId?: string;
  Id?: string;
  Arn?: string;
  InstanceType: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name?: string;
};
