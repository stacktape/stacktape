// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-trafficmirrorfilter.json

/** Resource schema for AWS::EC2::TrafficMirrorFilter */
export type AwsEc2Trafficmirrorfilter = {
  /** The ID of a traffic mirror filter. */
  Id?: string;
  /**
   * The network service that is associated with the traffic mirror filter.
   * @uniqueItems true
   */
  NetworkServices?: "amazon-dns"[];
  /** The description of a traffic mirror filter. */
  Description?: string;
  /**
   * The tags for a traffic mirror filter.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
