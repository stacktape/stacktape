// This file is auto-generated. Do not edit manually.
// Source: aws-ssmcontacts-rotation.json

/** Resource Type definition for AWS::SSMContacts::Rotation. */
export type AwsSsmcontactsRotation = {
  /**
   * Name of the Rotation
   * @pattern ^[a-zA-Z0-9_]*$
   */
  Name: string;
  /** Members of the rotation */
  ContactIds: string[];
  /**
   * Start time of the first shift of Oncall Schedule
   * @pattern ^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$
   */
  StartTime: string;
  /** TimeZone Identifier for the Oncall Schedule */
  TimeZoneId: string;
  Recurrence: unknown | unknown | unknown;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The key name of the tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The Amazon Resource Name (ARN) of the rotation. */
  Arn?: string;
};
