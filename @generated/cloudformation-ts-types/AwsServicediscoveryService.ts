// This file is auto-generated. Do not edit manually.
// Source: aws-servicediscovery-service.json

/** Resource Type definition for AWS::ServiceDiscovery::Service */
export type AwsServicediscoveryService = {
  Type?: string;
  Description?: string;
  HealthCheckCustomConfig?: {
    FailureThreshold?: number;
  };
  DnsConfig?: {
    /** @uniqueItems false */
    DnsRecords: {
      TTL: number;
      Type: string;
    }[];
    RoutingPolicy?: string;
    NamespaceId?: string;
  };
  ServiceAttributes?: Record<string, unknown>;
  Id?: string;
  NamespaceId?: string;
  HealthCheckConfig?: {
    Type: string;
    ResourcePath?: string;
    FailureThreshold?: number;
  };
  Arn?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name?: string;
};
