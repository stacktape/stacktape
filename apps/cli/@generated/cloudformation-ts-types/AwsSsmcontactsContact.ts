// This file is auto-generated. Do not edit manually.
// Source: aws-ssmcontacts-contact.json

/** Resource Type definition for AWS::SSMContacts::Contact */
export type AwsSsmcontactsContact = {
  /**
   * Alias of the contact. String value with 20 to 256 characters. Only alphabetical, numeric
   * characters, dash, or underscore allowed.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-z0-9_\-\.]*$
   */
  Alias: string;
  /**
   * Name of the contact. String value with 3 to 256 characters. Only alphabetical, space, numeric
   * characters, dash, or underscore allowed.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_\-\s]*$
   */
  DisplayName: string;
  /**
   * Contact type, which specify type of contact. Currently supported values: “PERSONAL”, “SHARED”,
   * “OTHER“.
   * @enum ["PERSONAL","ESCALATION","ONCALL_SCHEDULE"]
   */
  Type: "PERSONAL" | "ESCALATION" | "ONCALL_SCHEDULE";
  /** The stages that an escalation plan or engagement plan engages contacts and contact methods in. */
  Plan?: (unknown | unknown)[];
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
  /** The Amazon Resource Name (ARN) of the contact. */
  Arn?: string;
};
