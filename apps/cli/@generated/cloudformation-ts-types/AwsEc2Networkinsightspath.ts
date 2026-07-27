// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkinsightspath.json

/** Resource schema for AWS::EC2::NetworkInsightsPath */
export type AwsEc2Networkinsightspath = {
  NetworkInsightsPathId?: string;
  NetworkInsightsPathArn?: string;
  CreatedDate?: string;
  SourceIp?: string;
  FilterAtSource?: {
    SourceAddress?: string;
    SourcePortRange?: {
      FromPort?: number;
      ToPort?: number;
    };
    DestinationAddress?: string;
    DestinationPortRange?: {
      FromPort?: number;
      ToPort?: number;
    };
  };
  FilterAtDestination?: {
    SourceAddress?: string;
    SourcePortRange?: {
      FromPort?: number;
      ToPort?: number;
    };
    DestinationAddress?: string;
    DestinationPortRange?: {
      FromPort?: number;
      ToPort?: number;
    };
  };
  DestinationIp?: string;
  Source: string;
  Destination?: string;
  SourceArn?: string;
  DestinationArn?: string;
  Protocol: "tcp" | "udp";
  DestinationPort?: number;
  Tags?: {
    Key: string;
    Value?: string;
  }[];
};
