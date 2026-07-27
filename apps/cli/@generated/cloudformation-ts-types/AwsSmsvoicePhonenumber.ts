// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-phonenumber.json

/** Resource Type definition for AWS::SMSVOICE::PhoneNumber */
export type AwsSmsvoicePhonenumber = {
  Arn?: string;
  PhoneNumber?: string;
  PhoneNumberId?: string;
  /**
   * The two-character code, in ISO 3166-1 alpha-2 format, for the country or region.
   * @pattern ^[A-Z]{2}$
   */
  IsoCountryCode: string;
  /**
   * Indicates if the phone number will be used for text messages, voice messages, or both.
   * @uniqueItems true
   */
  NumberCapabilities: ("SMS" | "VOICE" | "MMS")[];
  /**
   * The type of phone number to request.
   * @enum ["LONG_CODE","TOLL_FREE","TEN_DLC","SIMULATOR"]
   */
  NumberType: "LONG_CODE" | "TOLL_FREE" | "TEN_DLC" | "SIMULATOR";
  /** When set to true the sender ID can't be deleted. By default this is set to false. */
  DeletionProtectionEnabled?: boolean;
  /**
   * The name of the OptOutList to associate with the phone number. You can use the OptOutListName or
   * OptOutListArn.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[A-Za-z0-9_:/-]+$
   */
  OptOutListName?: string;
  /**
   * By default this is set to false. When an end recipient sends a message that begins with HELP or
   * STOP to one of your dedicated numbers, AWS End User Messaging SMS and Voice automatically replies
   * with a customizable message and adds the end recipient to the OptOutList. When set to true you're
   * responsible for responding to HELP and STOP requests. You're also responsible for tracking and
   * honoring opt-out requests.
   */
  SelfManagedOptOutsEnabled?: boolean;
  /**
   * A keyword is a word that you can search for on a particular phone number or pool. It is also a
   * specific word or phrase that an end user can send to your number to elicit a response, such as an
   * informational message or a special offer. When your number receives a message that begins with a
   * keyword, AWS End User Messaging SMS and Voice responds with a customizable message. Keywords "HELP"
   * and "STOP" are mandatory keywords
   */
  MandatoryKeywords: {
    STOP: {
      /**
       * @maxLength 1600
       * @pattern ^(?!\s*$)[\s\S]+$
       */
      Message: string;
    };
    HELP: {
      /**
       * @maxLength 1600
       * @pattern ^(?!\s*$)[\s\S]+$
       */
      Message: string;
    };
  };
  /**
   * A keyword is a word that you can search for on a particular phone number or pool. It is also a
   * specific word or phrase that an end user can send to your number to elicit a response, such as an
   * informational message or a special offer. When your number receives a message that begins with a
   * keyword, AWS End User Messaging SMS and Voice responds with a customizable message.
   * @uniqueItems true
   */
  OptionalKeywords?: ({
    /**
     * @maxLength 30
     * @pattern ^(?!.*(?i)(stop|help))[ \S]+
     */
    Keyword: string;
    /**
     * @maxLength 1600
     * @pattern ^(?!\s*$)[\s\S]+$
     */
    Message: string;
    /** @enum ["AUTOMATIC_RESPONSE","OPT_OUT","OPT_IN"] */
    Action: "AUTOMATIC_RESPONSE" | "OPT_OUT" | "OPT_IN";
  })[];
  /**
   * When you set up two-way SMS, you can receive incoming messages from your customers. When one of
   * your customers sends a message to your phone number, the message body is sent to an Amazon SNS
   * topic or Amazon Connect for processing.
   */
  TwoWay?: {
    /**
     * By default this is set to false. When set to true you can receive incoming text messages from your
     * end recipients.
     */
    Enabled: boolean;
    /**
     * The Amazon Resource Name (ARN) of the two way channel.
     * @pattern ^arn:\S+$
     */
    ChannelArn?: string;
    /**
     * An optional IAM Role Arn for a service to assume, to be able to post inbound SMS messages.
     * @pattern ^arn:\S+$
     */
    ChannelRole?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
