// This file is auto-generated. Do not edit manually.
// Source: aws-codeartifact-packagegroup.json

/** The resource schema to create a CodeArtifact package group. */
export type AwsCodeartifactPackagegroup = {
  /**
   * The name of the domain that contains the package group.
   * @minLength 2
   * @maxLength 50
   * @pattern ^([a-z][a-z0-9\-]{0,48}[a-z0-9])$
   */
  DomainName: string;
  /**
   * The 12-digit account ID of the AWS account that owns the domain.
   * @pattern [0-9]{12}
   */
  DomainOwner?: string;
  /**
   * The package group pattern that is used to gather packages.
   * @minLength 2
   * @maxLength 520
   */
  Pattern: string;
  /**
   * The contact info of the package group.
   * @maxLength 1000
   */
  ContactInfo?: string;
  /**
   * The text description of the package group.
   * @maxLength 1000
   */
  Description?: string;
  /** The package origin configuration of the package group. */
  OriginConfiguration?: {
    /** The origin configuration that is applied to the package group. */
    Restrictions: {
      /** The publish restriction determines if new package versions can be published. */
      Publish?: {
        /** @enum ["ALLOW","BLOCK","ALLOW_SPECIFIC_REPOSITORIES","INHERIT"] */
        RestrictionMode: "ALLOW" | "BLOCK" | "ALLOW_SPECIFIC_REPOSITORIES" | "INHERIT";
        Repositories?: string[];
      };
      /**
       * The external upstream restriction determines if new package versions can be ingested or retained
       * from external connections.
       */
      ExternalUpstream?: {
        /** @enum ["ALLOW","BLOCK","ALLOW_SPECIFIC_REPOSITORIES","INHERIT"] */
        RestrictionMode: "ALLOW" | "BLOCK" | "ALLOW_SPECIFIC_REPOSITORIES" | "INHERIT";
        Repositories?: string[];
      };
      /**
       * The internal upstream restriction determines if new package versions can be ingested or retained
       * from upstream repositories.
       */
      InternalUpstream?: {
        /** @enum ["ALLOW","BLOCK","ALLOW_SPECIFIC_REPOSITORIES","INHERIT"] */
        RestrictionMode: "ALLOW" | "BLOCK" | "ALLOW_SPECIFIC_REPOSITORIES" | "INHERIT";
        Repositories?: string[];
      };
    };
  };
  /** An array of key-value pairs to apply to the package group. */
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
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The ARN of the package group.
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
};
