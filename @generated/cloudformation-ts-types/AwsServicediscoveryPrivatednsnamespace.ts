// This file is auto-generated. Do not edit manually.
// Source: aws-servicediscovery-privatednsnamespace.json

/** Resource Type definition for AWS::ServiceDiscovery::PrivateDnsNamespace */
export type AwsServicediscoveryPrivatednsnamespace = {
  Description?: string;
  HostedZoneId?: string;
  Vpc: string;
  Id?: string;
  Arn?: string;
  Properties?: {
    DnsProperties?: {
      SOA?: {
        TTL?: number;
      };
    };
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name: string;
};
