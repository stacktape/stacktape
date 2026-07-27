// This file is auto-generated. Do not edit manually.
// Source: aws-route53-cidrcollection.json

/** Resource Type definition for AWS::Route53::CidrCollection. */
export type AwsRoute53Cidrcollection = {
  /** UUID of the CIDR collection. */
  Id?: string;
  /**
   * A unique name for the CIDR collection.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9A-Za-z_\-]+$
   */
  Name: string;
  /** The Amazon resource name (ARN) to uniquely identify the AWS resource. */
  Arn?: string;
  /**
   * A complex type that contains information about the list of CIDR locations.
   * @uniqueItems true
   */
  Locations?: {
    /**
     * The name of the location that is associated with the CIDR collection.
     * @minLength 1
     * @maxLength 16
     */
    LocationName: string;
    /**
     * A list of CIDR blocks.
     * @uniqueItems true
     */
    CidrList: string[];
  }[];
};
