// This file is auto-generated. Do not edit manually.
// Source: aws-servicediscovery-publicdnsnamespace.json

/** Resource Type definition for AWS::ServiceDiscovery::PublicDnsNamespace */
export type AwsServicediscoveryPublicdnsnamespace = {
  Description?: string;
  HostedZoneId?: string;
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
