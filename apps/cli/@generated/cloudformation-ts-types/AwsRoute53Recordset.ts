// This file is auto-generated. Do not edit manually.
// Source: aws-route53-recordset.json

/** Resource Type definition for AWS::Route53::RecordSet */
export type AwsRoute53Recordset = {
  HealthCheckId?: string;
  AliasTarget?: {
    DNSName: string;
    HostedZoneId: string;
    EvaluateTargetHealth?: boolean;
  };
  Comment?: string;
  HostedZoneName?: string;
  /** @uniqueItems false */
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
  Id?: string;
  MultiValueAnswer?: boolean;
};
