// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-sdisource.json

/** Definition of AWS::MediaLive::SdiSource Resource Type */
export type AwsMedialiveSdisource = {
  /** The unique arn of the SdiSource. */
  Arn?: string;
  /** The unique identifier of the SdiSource. */
  Id?: string;
  Mode?: "QUADRANT" | "INTERLEAVE";
  /** The name of the SdiSource. */
  Name: string;
  State?: "IDLE" | "IN_USE" | "DELETED";
  Type: "SINGLE" | "QUAD";
  /** The list of inputs currently using this SDI source. */
  Inputs?: string[];
  /** A collection of key-value pairs. */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
