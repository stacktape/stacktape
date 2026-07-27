// This file is auto-generated. Do not edit manually.
// Source: aws-macie-customdataidentifier.json

/** Macie CustomDataIdentifier resource schema */
export type AwsMacieCustomdataidentifier = {
  /** Name of custom data identifier. */
  Name: string;
  /** Description of custom data identifier. */
  Description?: string;
  /** Regular expression for custom data identifier. */
  Regex: string;
  /** Maximum match distance. */
  MaximumMatchDistance?: number;
  /** Keywords to be matched against. */
  Keywords?: string[];
  /** Words to be ignored. */
  IgnoreWords?: string[];
  /** Custom data identifier ID. */
  Id?: string;
  /** Custom data identifier ARN. */
  Arn?: string;
  /** A collection of tags associated with a resource */
  Tags?: {
    /** The tag's key. */
    Key: string;
    /** The tag's value. */
    Value: string;
  }[];
};
