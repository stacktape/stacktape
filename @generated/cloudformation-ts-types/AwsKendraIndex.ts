// This file is auto-generated. Do not edit manually.
// Source: aws-kendra-index.json

/** A Kendra index */
export type AwsKendraIndex = {
  Id?: string;
  Arn?: string;
  /** A description for the index */
  Description?: string;
  /** Server side encryption configuration */
  ServerSideEncryptionConfiguration?: {
    KmsKeyId?: string;
  };
  /** Tags for labeling the index */
  Tags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Name: string;
  RoleArn: string;
  Edition: "DEVELOPER_EDITION" | "ENTERPRISE_EDITION" | "GEN_AI_ENTERPRISE_EDITION";
  /** Document metadata configurations */
  DocumentMetadataConfigurations?: ({
    Name: string;
    Type: "STRING_VALUE" | "STRING_LIST_VALUE" | "LONG_VALUE" | "DATE_VALUE";
    Relevance?: {
      Freshness?: boolean;
      Importance?: number;
      Duration?: string;
      RankOrder?: "ASCENDING" | "DESCENDING";
      ValueImportanceItems?: {
        Key?: string;
        Value?: number;
      }[];
    };
    Search?: {
      Facetable?: boolean;
      Searchable?: boolean;
      Displayable?: boolean;
      Sortable?: boolean;
    };
  })[];
  /** Capacity units */
  CapacityUnits?: {
    StorageCapacityUnits: number;
    QueryCapacityUnits: number;
  };
  UserContextPolicy?: "ATTRIBUTE_FILTER" | "USER_TOKEN";
  UserTokenConfigurations?: ({
    JwtTokenTypeConfiguration?: {
      KeyLocation: "URL" | "SECRET_MANAGER";
      URL?: string;
      SecretManagerArn?: string;
      UserNameAttributeField?: string;
      GroupAttributeField?: string;
      Issuer?: string;
      ClaimRegex?: string;
    };
    JsonTokenTypeConfiguration?: {
      UserNameAttributeField: string;
      GroupAttributeField: string;
    };
  })[];
};
