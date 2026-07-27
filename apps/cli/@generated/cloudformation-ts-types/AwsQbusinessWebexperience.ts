// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-webexperience.json

/** Definition of AWS::QBusiness::WebExperience Resource Type */
export type AwsQbusinessWebexperience = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  CreatedAt?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^(https?|ftp|file)://([^\s]*)$
   */
  DefaultEndpoint?: string;
  IdentityProviderConfiguration?: {
    SamlConfiguration: {
      /**
       * @minLength 1
       * @maxLength 1284
       * @pattern ^https://.*$
       */
      AuthenticationUrl: string;
    };
  } | {
    OpenIDConnectConfiguration: {
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      SecretsArn: string;
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      SecretsRole: string;
    };
  };
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  RoleArn?: string;
  SamplePromptsControlMode?: "ENABLED" | "DISABLED";
  Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED" | "PENDING_AUTH_CONFIG";
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[\s\S]*$
   */
  Subtitle?: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[\s\S]*$
   */
  Title?: string;
  UpdatedAt?: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  WebExperienceArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]*$
   */
  WebExperienceId?: string;
  /**
   * @minLength 0
   * @maxLength 300
   */
  WelcomeMessage?: string;
  /**
   * @minItems 0
   * @maxItems 10
   */
  Origins?: string[];
  CustomizationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 1284
     * @pattern ^(https?://[a-zA-Z0-9-_.+%/]+\.css)?$
     */
    CustomCSSUrl?: string;
    /**
     * @minLength 0
     * @maxLength 1284
     * @pattern ^(https?://[a-zA-Z0-9-_.+%/]+\.(svg|png))?$
     */
    LogoUrl?: string;
    /**
     * @minLength 0
     * @maxLength 1284
     * @pattern ^(https?://[a-zA-Z0-9-_.+%/]+\.(ttf|woff|woff2|otf))?$
     */
    FontUrl?: string;
    /**
     * @minLength 0
     * @maxLength 1284
     * @pattern ^(https?://[a-zA-Z0-9-_.+%/]+\.(svg|ico))?$
     */
    FaviconUrl?: string;
  };
  BrowserExtensionConfiguration?: {
    /**
     * @minItems 0
     * @maxItems 2
     * @uniqueItems true
     */
    EnabledBrowserExtensions: ("FIREFOX" | "CHROME")[];
  };
};
