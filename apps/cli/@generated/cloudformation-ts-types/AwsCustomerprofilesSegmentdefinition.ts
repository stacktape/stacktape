// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-segmentdefinition.json

/** A segment definition resource of Amazon Connect Customer Profiles */
export type AwsCustomerprofilesSegmentdefinition = {
  /** The time of this segment definition got created. */
  CreatedAt?: string;
  /**
   * The description of the segment definition.
   * @minLength 1
   * @maxLength 4000
   */
  Description?: string;
  /**
   * The display name of the segment definition.
   * @minLength 1
   * @maxLength 255
   */
  DisplayName: string;
  /**
   * The unique name of the domain.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  DomainName: string;
  /**
   * The unique name of the segment definition.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  SegmentDefinitionName: string;
  /**
   * An array that defines the set of segment criteria to evaluate when handling segment groups for the
   * segment.
   */
  SegmentGroups?: {
    Groups?: ({
      Dimensions?: ({
        ProfileAttributes: {
          AccountNumber?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          AdditionalInformation?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          FirstName?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          LastName?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          MiddleName?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          GenderString?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          PartyTypeString?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          BirthDate?: {
            DimensionType: "BEFORE" | "AFTER" | "BETWEEN" | "NOT_BETWEEN" | "ON";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          PhoneNumber?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          BusinessName?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          BusinessPhoneNumber?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          HomePhoneNumber?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          MobilePhoneNumber?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          EmailAddress?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          PersonalEmailAddress?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          BusinessEmailAddress?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          };
          Address?: {
            City?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Country?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            County?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            PostalCode?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Province?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            State?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
          };
          ShippingAddress?: {
            City?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Country?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            County?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            PostalCode?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Province?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            State?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
          };
          MailingAddress?: {
            City?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Country?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            County?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            PostalCode?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Province?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            State?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
          };
          BillingAddress?: {
            City?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Country?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            County?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            PostalCode?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            Province?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
            State?: {
              DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH";
              /**
               * @minItems 1
               * @maxItems 50
               */
              Values: string[];
            };
          };
          Attributes?: Record<string, {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH" | "BEFORE" | "AFTER" | "BETWEEN" | "NOT_BETWEEN" | "ON" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL" | "EQUAL";
            /**
             * @minItems 1
             * @maxItems 50
             */
            Values: string[];
          }>;
          ProfileType?: {
            DimensionType: "INCLUSIVE" | "EXCLUSIVE";
            /**
             * @minItems 1
             * @maxItems 1
             */
            Values: ("ACCOUNT_PROFILE" | "PROFILE")[];
          };
        };
      } | {
        CalculatedAttributes?: Record<string, {
          DimensionType: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH" | "BEFORE" | "AFTER" | "BETWEEN" | "NOT_BETWEEN" | "ON" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL" | "EQUAL";
          /**
           * @minItems 1
           * @maxItems 50
           */
          Values: string[];
          ConditionOverrides?: {
            Range?: {
              /**
               * The starting point for this overridden range. Positive numbers indicate how many days in the past
               * data should be included, and negative numbers indicate how many days in the future.
               * @minimum -2147483648
               * @maximum 2147483647
               */
              Start: number;
              /**
               * The ending point for this overridden range. Positive numbers indicate how many days in the past
               * data should be included, and negative numbers indicate how many days in the future.
               * @minimum -2147483648
               * @maximum 2147483647
               */
              End?: number;
              /**
               * The unit to be applied to the range.
               * @enum ["DAYS"]
               */
              Unit: "DAYS";
            };
          };
        }>;
      })[];
      SourceSegments?: {
        /**
         * @minLength 1
         * @maxLength 64
         * @pattern ^[a-zA-Z0-9_-]+$
         */
        SegmentDefinitionName?: string;
      }[];
      SourceType?: "ALL" | "ANY" | "NONE";
      Type?: "ALL" | "ANY" | "NONE";
    })[];
    Include?: "ALL" | "ANY" | "NONE";
  };
  /**
   * The SQL query that defines the segment criteria.
   * @minLength 1
   * @maxLength 50000
   */
  SegmentSqlQuery?: string;
  /**
   * The Amazon Resource Name (ARN) of the segment definition.
   * @minLength 1
   * @maxLength 255
   */
  SegmentDefinitionArn?: string;
  /**
   * The SQL query that defines the segment criteria.
   * @enum ["CLASSIC","ENHANCED"]
   */
  SegmentType?: "CLASSIC" | "ENHANCED";
  /**
   * The tags used to organize, track, or control access for this resource.
   * @minItems 0
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
