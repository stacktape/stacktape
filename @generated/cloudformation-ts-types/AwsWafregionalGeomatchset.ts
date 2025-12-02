// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-geomatchset.json

/** Resource Type definition for AWS::WAFRegional::GeoMatchSet */
export type AwsWafregionalGeomatchset = {
  Id?: string;
  /** @uniqueItems false */
  GeoMatchConstraints?: {
    Type: string;
    Value: string;
  }[];
  Name: string;
};
