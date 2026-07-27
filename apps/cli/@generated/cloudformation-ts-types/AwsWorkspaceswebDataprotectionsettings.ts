// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-dataprotectionsettings.json

/** Definition of AWS::WorkSpacesWeb::DataProtectionSettings Resource Type */
export type AwsWorkspaceswebDataprotectionsettings = {
  AdditionalEncryptionContext?: Record<string, string>;
  AssociatedPortalArns?: string[];
  CreationDate?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:key\/[a-zA-Z0-9-]+$
   */
  CustomerManagedKey?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  DataProtectionSettingsArn?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[ _\-\d\w]+$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[ _\-\d\w]+$
   */
  DisplayName?: string;
  InlineRedactionConfiguration?: {
    /**
     * @minItems 0
     * @maxItems 150
     */
    InlineRedactionPatterns: {
      /**
       * @minLength 1
       * @maxLength 50
       * @pattern ^[_\-\d\w]+$
       */
      BuiltInPatternId?: string;
      CustomPattern?: {
        /**
         * @minLength 1
         * @maxLength 20
         * @pattern ^[_\-\d\w]+$
         */
        PatternName: string;
        /**
         * @minLength 0
         * @maxLength 300
         * @pattern ^\/((?:[^\n])+)\/([gimsuyvd]{0,8})$
         */
        PatternRegex: string;
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^[ _\-\d\w]+$
         */
        PatternDescription?: string;
        /**
         * @minLength 0
         * @maxLength 300
         * @pattern ^\/((?:[^\n])+)\/([gimsuyvd]{0,8})$
         */
        KeywordRegex?: string;
      };
      RedactionPlaceHolder: {
        RedactionPlaceHolderType: "CustomText";
        /**
         * @minLength 1
         * @maxLength 20
         * @pattern ^[*_\-\d\w]+$
         */
        RedactionPlaceHolderText?: string;
      };
      /**
       * @minItems 1
       * @maxItems 20
       */
      EnforcedUrls?: string[];
      /**
       * @minItems 1
       * @maxItems 20
       */
      ExemptUrls?: string[];
      /**
       * @minimum 1
       * @maximum 3
       */
      ConfidenceLevel?: number;
    }[];
    /**
     * @minItems 1
     * @maxItems 100
     */
    GlobalEnforcedUrls?: string[];
    /**
     * @minItems 1
     * @maxItems 100
     */
    GlobalExemptUrls?: string[];
    /**
     * @minimum 1
     * @maximum 3
     */
    GlobalConfidenceLevel?: number;
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
