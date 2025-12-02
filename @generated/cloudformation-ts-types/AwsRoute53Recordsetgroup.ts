// This file is auto-generated. Do not edit manually.
// Source: aws-route53-recordsetgroup.json

/** Resource Type definition for AWS::Route53::RecordSetGroup */
export type AwsRoute53Recordsetgroup = {
  Comment?: string;
  Id?: string;
  HostedZoneName?: string;
  /** @uniqueItems true */
  RecordSets?: {
    HealthCheckId?: string;
    AliasTarget?: {
      DNSName: string;
      HostedZoneId: string;
      EvaluateTargetHealth?: boolean;
    };
    HostedZoneName?: string;
    /** @uniqueItems true */
    ResourceRecords?: string[];
    HostedZoneId?: string;
    SetIdentifier?: string;
    TTL?: string;
    Weight?: number;
    Name: string;
    Type: string;
    CidrRoutingConfig?: {
      CollectionId: string;
      LocationName: string;
    };
    Failover?: string;
    GeoProximityLocation?: {
      AWSRegion?: string;
      LocalZoneGroup?: string;
      Bias?: number;
      Coordinates?: {
        Longitude: string;
        Latitude: string;
      };
    };
    Region?: string;
    GeoLocation?: {
      ContinentCode?: string;
      CountryCode?: string;
      SubdivisionCode?: string;
    };
    MultiValueAnswer?: boolean;
  }[];
  HostedZoneId?: string;
};
