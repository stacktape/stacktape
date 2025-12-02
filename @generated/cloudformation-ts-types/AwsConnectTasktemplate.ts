// This file is auto-generated. Do not edit manually.
// Source: aws-connect-tasktemplate.json

/** Resource Type definition for AWS::Connect::TaskTemplate. */
export type AwsConnectTasktemplate = {
  /**
   * The identifier (arn) of the task template.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/task-template/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$
   */
  Arn?: string;
  /**
   * The identifier (arn) of the instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The name of the task template.
   * @minLength 1
   * @maxLength 100
   */
  Name?: string;
  /**
   * The description of the task template.
   * @minLength 0
   * @maxLength 255
   */
  Description?: string;
  /**
   * The identifier of the contact flow.
   * @pattern ^$|arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/contact-flow/[-a-zA-Z0-9]*$
   */
  ContactFlowArn?: string;
  /**
   * The identifier of the contact flow.
   * @pattern ^$|arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/contact-flow/[-a-zA-Z0-9]*$
   */
  SelfAssignContactFlowArn?: string;
  /** The constraints for the task template */
  Constraints?: {
    InvisibleFields?: {
      Id: {
        /**
         * The name of the task template field
         * @minLength 1
         * @maxLength 100
         */
        Name: string;
      };
    }[];
    RequiredFields?: {
      Id: {
        /**
         * The name of the task template field
         * @minLength 1
         * @maxLength 100
         */
        Name: string;
      };
    }[];
    ReadOnlyFields?: {
      Id: {
        /**
         * The name of the task template field
         * @minLength 1
         * @maxLength 100
         */
        Name: string;
      };
    }[];
  };
  /** @maxItems 50 */
  Defaults?: {
    Id: {
      /**
       * The name of the task template field
       * @minLength 1
       * @maxLength 100
       */
      Name: string;
    };
    DefaultValue: string;
  }[];
  /**
   * The list of task template's fields
   * @maxItems 50
   */
  Fields?: ({
    Id: {
      /**
       * The name of the task template field
       * @minLength 1
       * @maxLength 100
       */
      Name: string;
    };
    /**
     * The description of the task template's field
     * @minLength 0
     * @maxLength 255
     */
    Description?: string;
    Type: "NAME" | "DESCRIPTION" | "SCHEDULED_TIME" | "QUICK_CONNECT" | "URL" | "NUMBER" | "TEXT" | "TEXT_AREA" | "DATE_TIME" | "BOOLEAN" | "SINGLE_SELECT" | "EMAIL" | "EXPIRY_DURATION" | "SELF_ASSIGN";
    /**
     * list of field options to be used with single select
     * @maxItems 50
     */
    SingleSelectOptions?: string[];
  })[];
  Status?: "ACTIVE" | "INACTIVE";
  ClientToken?: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. . You can specify a value that is maximum of 256 Unicode characters in
     * length and cannot be prefixed with aws:. You can use any of the following characters: the set of
     * Unicode letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
};
