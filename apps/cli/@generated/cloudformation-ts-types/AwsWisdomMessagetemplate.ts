// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-messagetemplate.json

/** Definition of AWS::Wisdom::MessageTemplate Resource Type */
export type AwsWisdomMessagetemplate = {
  /**
   * The Amazon Resource Name (ARN) of the knowledge base to which the message template belongs.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$
   */
  KnowledgeBaseArn: string;
  /**
   * The unique identifier of the message template.
   * @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  MessageTemplateId?: string;
  /**
   * The Amazon Resource Name (ARN) of the message template.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$
   */
  MessageTemplateArn?: string;
  /**
   * The name of the message template.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\\s_.,-]+
   */
  Name: string;
  ChannelSubtype: "EMAIL" | "SMS";
  Content: unknown | unknown;
  /**
   * The description of the message template.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\\s_.,-]+
   */
  Description?: string;
  /**
   * The language code value for the language in which the message template is written. The supported
   * language codes include de_DE, en_US, es_ES, fr_FR, id_ID, it_IT, ja_JP, ko_KR, pt_BR, zh_CN, zh_TW
   * @minLength 2
   * @maxLength 5
   */
  Language?: string;
  GroupingConfiguration?: {
    /**
     * The criteria used for grouping Amazon Q in Connect users.
     * @minLength 1
     * @maxLength 100
     */
    Criteria: string;
    /**
     * The list of values that define different groups of Amazon Q in Connect users.
     * @uniqueItems true
     */
    Values: string[];
  };
  DefaultAttributes?: {
    SystemAttributes?: {
      /**
       * The name of the task.
       * @minLength 1
       * @maxLength 32767
       */
      Name?: string;
      /** The CustomerEndpoint attribute. */
      CustomerEndpoint?: {
        /**
         * The customer's phone number if used with customerEndpoint, or the number the customer dialed to
         * call your contact center if used with systemEndpoint.
         * @minLength 1
         * @maxLength 32767
         */
        Address?: string;
      };
      /** The SystemEndpoint attribute. */
      SystemEndpoint?: {
        /**
         * The customer's phone number if used with customerEndpoint, or the number the customer dialed to
         * call your contact center if used with systemEndpoint.
         * @minLength 1
         * @maxLength 32767
         */
        Address?: string;
      };
    };
    AgentAttributes?: {
      /**
       * The agent’s first name as entered in their Amazon Connect user account.
       * @minLength 1
       * @maxLength 32767
       */
      FirstName?: string;
      /**
       * The agent’s last name as entered in their Amazon Connect user account.
       * @minLength 1
       * @maxLength 32767
       */
      LastName?: string;
    };
    CustomerProfileAttributes?: {
      /**
       * The unique identifier of a customer profile.
       * @minLength 1
       * @maxLength 32767
       */
      ProfileId?: string;
      /**
       * The ARN of a customer profile.
       * @minLength 1
       * @maxLength 32767
       */
      ProfileARN?: string;
      /**
       * The customer's first name.
       * @minLength 1
       * @maxLength 32767
       */
      FirstName?: string;
      /**
       * The customer's middle name.
       * @minLength 1
       * @maxLength 32767
       */
      MiddleName?: string;
      /**
       * The customer's last name.
       * @minLength 1
       * @maxLength 32767
       */
      LastName?: string;
      /**
       * A unique account number that you have given to the customer.
       * @minLength 1
       * @maxLength 32767
       */
      AccountNumber?: string;
      /**
       * The customer's email address, which has not been specified as a personal or business address.
       * @minLength 1
       * @maxLength 32767
       */
      EmailAddress?: string;
      /**
       * The customer's phone number, which has not been specified as a mobile, home, or business number.
       * @minLength 1
       * @maxLength 32767
       */
      PhoneNumber?: string;
      /**
       * Any additional information relevant to the customer's profile.
       * @minLength 1
       * @maxLength 32767
       */
      AdditionalInformation?: string;
      /**
       * The customer's party type.
       * @minLength 1
       * @maxLength 32767
       */
      PartyType?: string;
      /**
       * The name of the customer's business.
       * @minLength 1
       * @maxLength 32767
       */
      BusinessName?: string;
      /**
       * The customer's birth date.
       * @minLength 1
       * @maxLength 32767
       */
      BirthDate?: string;
      /**
       * The customer's gender.
       * @minLength 1
       * @maxLength 32767
       */
      Gender?: string;
      /**
       * The customer's mobile phone number.
       * @minLength 1
       * @maxLength 32767
       */
      MobilePhoneNumber?: string;
      /**
       * The customer's home phone number.
       * @minLength 1
       * @maxLength 32767
       */
      HomePhoneNumber?: string;
      /**
       * The customer's business phone number.
       * @minLength 1
       * @maxLength 32767
       */
      BusinessPhoneNumber?: string;
      /**
       * The customer's business email address.
       * @minLength 1
       * @maxLength 32767
       */
      BusinessEmailAddress?: string;
      /**
       * The first line of a customer address.
       * @minLength 1
       * @maxLength 32767
       */
      Address1?: string;
      /**
       * The second line of a customer address.
       * @minLength 1
       * @maxLength 32767
       */
      Address2?: string;
      /**
       * The third line of a customer address.
       * @minLength 1
       * @maxLength 32767
       */
      Address3?: string;
      /**
       * The fourth line of a customer address.
       * @minLength 1
       * @maxLength 32767
       */
      Address4?: string;
      /**
       * The city in which a customer lives.
       * @minLength 1
       * @maxLength 32767
       */
      City?: string;
      /**
       * The county in which a customer lives.
       * @minLength 1
       * @maxLength 32767
       */
      County?: string;
      /**
       * The country in which a customer lives.
       * @minLength 1
       * @maxLength 32767
       */
      Country?: string;
      /**
       * The postal code of a customer address.
       * @minLength 1
       * @maxLength 32767
       */
      PostalCode?: string;
      /**
       * The province in which a customer lives.
       * @minLength 1
       * @maxLength 32767
       */
      Province?: string;
      /**
       * The state in which a customer lives.
       * @minLength 1
       * @maxLength 32767
       */
      State?: string;
      /**
       * The first line of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingAddress1?: string;
      /**
       * The second line of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingAddress2?: string;
      /**
       * The third line of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingAddress3?: string;
      /**
       * The fourth line of a customer’s shipping address
       * @minLength 1
       * @maxLength 32767
       */
      ShippingAddress4?: string;
      /**
       * The city of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingCity?: string;
      /**
       * The county of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingCounty?: string;
      /**
       * The country of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingCountry?: string;
      /**
       * The postal code of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingPostalCode?: string;
      /**
       * The province of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingProvince?: string;
      /**
       * The state of a customer’s shipping address.
       * @minLength 1
       * @maxLength 32767
       */
      ShippingState?: string;
      /**
       * The first line of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingAddress1?: string;
      /**
       * The second line of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingAddress2?: string;
      /**
       * The third line of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingAddress3?: string;
      /**
       * The fourth line of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingAddress4?: string;
      /**
       * The city of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingCity?: string;
      /**
       * The county of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingCounty?: string;
      /**
       * The country of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingCountry?: string;
      /**
       * The postal code of a customer’s mailing address
       * @minLength 1
       * @maxLength 32767
       */
      MailingPostalCode?: string;
      /**
       * The province of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingProvince?: string;
      /**
       * The state of a customer’s mailing address.
       * @minLength 1
       * @maxLength 32767
       */
      MailingState?: string;
      /**
       * The first line of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingAddress1?: string;
      /**
       * The second line of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingAddress2?: string;
      /**
       * The third line of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingAddress3?: string;
      /**
       * The fourth line of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingAddress4?: string;
      /**
       * The city of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingCity?: string;
      /**
       * The county of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingCounty?: string;
      /**
       * The country of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingCountry?: string;
      /**
       * The postal code of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingPostalCode?: string;
      /**
       * The province of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingProvince?: string;
      /**
       * The state of a customer’s billing address.
       * @minLength 1
       * @maxLength 32767
       */
      BillingState?: string;
      Custom?: Record<string, string>;
    };
    CustomAttributes?: Record<string, string>;
  };
  /**
   * The content SHA256 of the message template.
   * @minLength 1
   * @maxLength 64
   */
  MessageTemplateContentSha256?: string;
  /** List of message template attachments */
  MessageTemplateAttachments?: {
    /** @minLength 1 */
    AttachmentId?: string;
    AttachmentName: string;
    S3PresignedUrl: string;
  }[];
  /**
   * The tags used to organize, track, or control access for this resource. For example, { "tags":
   * {"key1":"value1", "key2":"value2"} }.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
