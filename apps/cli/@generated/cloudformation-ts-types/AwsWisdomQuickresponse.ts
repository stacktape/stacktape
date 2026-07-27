// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-quickresponse.json

/** Definition of AWS::Wisdom::QuickResponse Resource Type. */
export type AwsWisdomQuickresponse = {
  /**
   * The media type of the quick response content.
   * - Use application/x.quickresponse;format=plain for quick response written in plain text.
   * - Use application/x.quickresponse;format=markdown for quick response written in richtext.
   * @pattern ^(application/x\.quickresponse;format=(plain|markdown))$
   */
  ContentType?: string;
  /**
   * The Amazon Resource Name (ARN) of the knowledge base.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$
   */
  KnowledgeBaseArn: string;
  /**
   * The name of the quick response.
   * @minLength 1
   * @maxLength 100
   */
  Name: string;
  /**
   * The Amazon Resource Name (ARN) of the quick response.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$
   */
  QuickResponseArn?: string;
  /**
   * The identifier of the quick response.
   * @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  QuickResponseId?: string;
  /** The Amazon Connect contact channels this quick response applies to. */
  Channels?: ("Chat" | "Email")[];
  Content: {
    /**
     * The content of the quick response.
     * @minLength 1
     * @maxLength 1024
     */
    Content?: string;
  };
  Contents?: {
    Markdown?: {
      /**
       * The content of the quick response.
       * @minLength 1
       * @maxLength 1024
       */
      Content?: string;
    };
    PlainText?: {
      /**
       * The content of the quick response.
       * @minLength 1
       * @maxLength 1024
       */
      Content?: string;
    };
  };
  /**
   * The description of the quick response.
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
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
  /** Whether the quick response is active. */
  IsActive?: boolean;
  /**
   * The language code value for the language in which the quick response is written. The supported
   * language codes include de_DE, en_US, es_ES, fr_FR, id_ID, it_IT, ja_JP, ko_KR, pt_BR, zh_CN, zh_TW
   * @minLength 2
   * @maxLength 5
   */
  Language?: string;
  /**
   * The shortcut key of the quick response. The value should be unique across the knowledge base.
   * @minLength 1
   * @maxLength 100
   */
  ShortcutKey?: string;
  Status?: "CREATE_IN_PROGRESS" | "CREATE_FAILED" | "CREATED" | "DELETE_IN_PROGRESS" | "DELETE_FAILED" | "DELETED" | "UPDATE_IN_PROGRESS" | "UPDATE_FAILED";
  /**
   * An array of key-value pairs to apply to this resource.
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
