// This file is auto-generated. Do not edit manually.
// Source: aws-groundstation-missionprofile.json

/** AWS Ground Station Mission Profile resource type for CloudFormation. */
export type AwsGroundstationMissionprofile = {
  /**
   * A name used to identify a mission profile.
   * @pattern ^[ a-zA-Z0-9_:-]{1,256}$
   */
  Name: string;
  /** Pre-pass time needed before the contact. */
  ContactPrePassDurationSeconds?: number;
  /** Post-pass time needed after the contact. */
  ContactPostPassDurationSeconds?: number;
  /**
   * Visibilities with shorter duration than the specified minimum viable contact duration will be
   * ignored when searching for available contacts.
   */
  MinimumViableContactDurationSeconds: number;
  /**
   * The ARN of a KMS Key used for encrypting data during transmission from the source to destination
   * locations.
   */
  StreamsKmsKey?: unknown | unknown | unknown;
  /** The ARN of the KMS Key or Alias Key role used to define permissions on KMS Key usage. */
  StreamsKmsRole?: string;
  /** @minItems 1 */
  DataflowEdges: {
    Source?: string;
    Destination?: string;
  }[];
  /** @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$ */
  TrackingConfigArn: string;
  Tags?: {
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,128}$ */
    Key: string;
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,256}$ */
    Value: string;
  }[];
  Id?: string;
  /** @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$ */
  Arn?: string;
  Region?: string;
};
