// This file is auto-generated. Do not edit manually.
// Source: aws-iot-command.json

/** Represents the resource definition of AWS IoT Command. */
export type AwsIotCommand = {
  /** The Amazon Resource Name (ARN) of the command. */
  CommandArn?: string;
  /**
   * The unique identifier for the command.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  CommandId: string;
  /** The date and time when the command was created. */
  CreatedAt?: string;
  /** A flag indicating whether the command is deprecated. */
  Deprecated?: boolean;
  /**
   * The description of the command.
   * @maxLength 2028
   */
  Description?: string;
  /** The display name for the command. */
  DisplayName?: string;
  /** The date and time when the command was last updated. */
  LastUpdatedAt?: string;
  /** The list of mandatory parameters for the command. */
  MandatoryParameters?: {
    Name: string;
    Value?: {
      /** @minLength 1 */
      S?: string;
      B?: boolean;
      I?: number;
      /**
       * @maxLength 19
       * @pattern ^-?\d+$
       */
      L?: string;
      D?: number;
      /** @minLength 1 */
      BIN?: string;
      /**
       * @minLength 1
       * @maxLength 20
       * @pattern ^[0-9]*$
       */
      UL?: string;
    };
    DefaultValue?: {
      /** @minLength 1 */
      S?: string;
      B?: boolean;
      I?: number;
      /**
       * @maxLength 19
       * @pattern ^-?\d+$
       */
      L?: string;
      D?: number;
      /** @minLength 1 */
      BIN?: string;
      /**
       * @minLength 1
       * @maxLength 20
       * @pattern ^[0-9]*$
       */
      UL?: string;
    };
    Description?: string;
  }[];
  /**
   * The namespace to which the command belongs.
   * @enum ["AWS-IoT","AWS-IoT-FleetWise"]
   */
  Namespace?: "AWS-IoT" | "AWS-IoT-FleetWise";
  /**
   * The customer role associated with the command.
   * @minLength 20
   * @maxLength 2028
   */
  RoleArn?: string;
  /** The payload associated with the command. */
  Payload?: {
    Content?: string;
    ContentType?: string;
  };
  /** A flag indicating whether the command is pending deletion. */
  PendingDeletion?: boolean;
  /** The tags to be associated with the command. */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
