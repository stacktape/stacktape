// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancing-loadbalancer.json

/** Resource Type definition for AWS::ElasticLoadBalancing::LoadBalancer */
export type AwsElasticloadbalancingLoadbalancer = {
  /** @uniqueItems true */
  SecurityGroups?: string[];
  ConnectionDrainingPolicy?: {
    Enabled: boolean;
    Timeout?: number;
  };
  /** @uniqueItems true */
  Policies?: {
    /** @uniqueItems true */
    Attributes: Record<string, unknown>[];
    PolicyType: string;
    /** @uniqueItems true */
    LoadBalancerPorts?: string[];
    PolicyName: string;
    /** @uniqueItems true */
    InstancePorts?: string[];
  }[];
  Scheme?: string;
  /** @uniqueItems true */
  AvailabilityZones?: string[];
  SourceSecurityGroupOwnerAlias?: string;
  HealthCheck?: {
    Target: string;
    UnhealthyThreshold: string;
    Timeout: string;
    HealthyThreshold: string;
    Interval: string;
  };
  CanonicalHostedZoneNameID?: string;
  CanonicalHostedZoneName?: string;
  DNSName?: string;
  AccessLoggingPolicy?: {
    Enabled: boolean;
    S3BucketName: string;
    EmitInterval?: number;
    S3BucketPrefix?: string;
  };
  /** @uniqueItems true */
  Instances?: string[];
  LoadBalancerName?: string;
  /** @uniqueItems true */
  Listeners: {
    /** @uniqueItems true */
    PolicyNames?: string[];
    InstancePort: string;
    LoadBalancerPort: string;
    Protocol: string;
    SSLCertificateId?: string;
    InstanceProtocol?: string;
  }[];
  /** @uniqueItems true */
  Subnets?: string[];
  CrossZone?: boolean;
  /** @uniqueItems true */
  AppCookieStickinessPolicy?: {
    CookieName: string;
    PolicyName: string;
  }[];
  /** @uniqueItems true */
  LBCookieStickinessPolicy?: {
    CookieExpirationPeriod?: string;
    PolicyName?: string;
  }[];
  Id?: string;
  SourceSecurityGroupGroupName?: string;
  ConnectionSettings?: {
    IdleTimeout: number;
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
