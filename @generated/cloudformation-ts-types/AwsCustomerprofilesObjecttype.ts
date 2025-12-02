// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-objecttype.json

/** An ObjectType resource of Amazon Connect Customer Profiles */
export type AwsCustomerprofilesObjecttype = {
  /**
   * The unique name of the domain.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  DomainName: string;
  /**
   * The name of the profile object type.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z_][a-zA-Z_0-9-]*$
   */
  ObjectTypeName: string;
  /** Indicates whether a profile should be created when data is received. */
  AllowProfileCreation?: boolean;
  /**
   * Description of the profile object type.
   * @minLength 1
   * @maxLength 10000
   */
  Description: string;
  /**
   * The default encryption key
   * @minLength 0
   * @maxLength 255
   */
  EncryptionKey?: string;
  /**
   * The default number of days until the data within the domain expires.
   * @minimum 1
   * @maximum 1098
   */
  ExpirationDays?: number;
  /** A list of the name and ObjectType field. */
  Fields?: ({
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    Name?: string;
    ObjectTypeField?: {
      /**
       * A field of a ProfileObject. For example: _source.FirstName, where "_source" is a ProfileObjectType
       * of a Zendesk user and "FirstName" is a field in that ObjectType.
       * @minLength 1
       * @maxLength 1000
       */
      Source?: string;
      /**
       * The location of the data in the standard ProfileObject model. For example:
       * _profile.Address.PostalCode.
       * @minLength 1
       * @maxLength 1000
       */
      Target?: string;
      /**
       * The content type of the field. Used for determining equality when searching.
       * @enum ["STRING","NUMBER","PHONE_NUMBER","EMAIL_ADDRESS","NAME"]
       */
      ContentType?: "STRING" | "NUMBER" | "PHONE_NUMBER" | "EMAIL_ADDRESS" | "NAME";
    };
  })[];
  /** A list of unique keys that can be used to map data to the profile. */
  Keys?: ({
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    Name?: string;
    ObjectTypeKeyList?: ({
      /** The reference for the key name of the fields map. */
      FieldNames?: string[];
      /**
       * The types of keys that a ProfileObject can have. Each ProfileObject can have only 1 UNIQUE key but
       * multiple PROFILE keys. PROFILE means that this key can be used to tie an object to a PROFILE.
       * UNIQUE means that it can be used to uniquely identify an object. If a key a is marked as SECONDARY,
       * it will be used to search for profiles after all other PROFILE keys have been searched. A
       * LOOKUP_ONLY key is only used to match a profile but is not persisted to be used for searching of
       * the profile. A NEW_ONLY key is only used if the profile does not already exist before the object is
       * ingested, otherwise it is only used for matching objects to profiles.
       */
      StandardIdentifiers?: ("PROFILE" | "UNIQUE" | "SECONDARY" | "LOOKUP_ONLY" | "NEW_ONLY" | "ASSET" | "CASE" | "ORDER" | "AIR_PREFERENCE" | "AIR_BOOKING" | "AIR_SEGMENT" | "HOTEL_PREFERENCE" | "HOTEL_STAY_REVENUE" | "HOTEL_RESERVATION" | "LOYALTY" | "LOYALTY_TRANSACTION" | "LOYALTY_PROMOTION")[];
    })[];
  })[];
  /** The time of this integration got created. */
  CreatedAt?: string;
  /** The time of this integration got last updated at. */
  LastUpdatedAt?: string;
  /**
   * The format of your sourceLastUpdatedTimestamp that was previously set up.
   * @minLength 1
   * @maxLength 255
   */
  SourceLastUpdatedTimestampFormat?: string;
  /**
   * The tags (keys and values) associated with the integration.
   * @minItems 0
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * A unique identifier for the object template.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  TemplateId?: string;
  /**
   * The maximum number of profile objects for this object type
   * @minimum 1
   */
  MaxProfileObjectCount?: number;
  /**
   * The maximum available number of profile objects
   * @minimum 0
   */
  MaxAvailableProfileObjectCount?: number;
};
