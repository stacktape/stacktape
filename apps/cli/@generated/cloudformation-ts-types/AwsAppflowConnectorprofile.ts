// This file is auto-generated. Do not edit manually.
// Source: aws-appflow-connectorprofile.json

/** Resource Type definition for AWS::AppFlow::ConnectorProfile */
export type AwsAppflowConnectorprofile = {
  /**
   * Unique identifier for connector profile resources
   * @maxLength 512
   * @pattern arn:aws:appflow:.*:[0-9]+:.*
   */
  ConnectorProfileArn?: string;
  /**
   * The label of the connector. The label is unique for each ConnectorRegistration in your AWS account.
   * Only needed if calling for CUSTOMCONNECTOR connector type/.
   * @maxLength 256
   * @pattern [\w!@#.-]+
   */
  ConnectorLabel?: string;
  /**
   * The maximum number of items to retrieve in a single batch.
   * @maxLength 256
   * @pattern [\w/!@#+=.-]+
   */
  ConnectorProfileName: string;
  /**
   * The ARN of the AWS Key Management Service (AWS KMS) key that's used to encrypt your function's
   * environment variables. If it's not provided, AWS Lambda uses a default service key.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws:kms:.*:[0-9]+:.*
   */
  KMSArn?: string;
  /** List of Saas providers that need connector profile to be created */
  ConnectorType: "Salesforce" | "Pardot" | "Singular" | "Slack" | "Redshift" | "Marketo" | "Googleanalytics" | "Zendesk" | "Servicenow" | "SAPOData" | "Datadog" | "Trendmicro" | "Snowflake" | "Dynatrace" | "Infornexus" | "Amplitude" | "Veeva" | "CustomConnector";
  /**
   * Mode in which data transfer should be enabled. Private connection mode is currently enabled for
   * Salesforce, Snowflake, Trendmicro and Singular
   * @enum ["Public","Private"]
   */
  ConnectionMode: "Public" | "Private";
  /** Connector specific configurations needed to create connector profile */
  ConnectorProfileConfig?: {
    ConnectorProfileProperties?: {
      Datadog?: {
        /** The location of the Datadog resource */
        InstanceUrl: string;
      };
      Dynatrace?: {
        /** The location of the Dynatrace resource */
        InstanceUrl: string;
      };
      InforNexus?: {
        /** The location of the InforNexus resource */
        InstanceUrl: string;
      };
      Marketo?: {
        /** The location of the Marketo resource */
        InstanceUrl: string;
      };
      Redshift?: {
        /** The JDBC URL of the Amazon Redshift cluster. */
        DatabaseUrl?: string;
        /** The name of the Amazon S3 bucket associated with Redshift. */
        BucketName: string;
        /** The object key for the destination bucket in which Amazon AppFlow will place the ﬁles. */
        BucketPrefix?: string;
        /** The Amazon Resource Name (ARN) of the IAM role. */
        RoleArn: string;
        /** If Amazon AppFlow will connect to Amazon Redshift Serverless or Amazon Redshift cluster. */
        IsRedshiftServerless?: boolean;
        /**
         * The Amazon Resource Name (ARN) of the IAM role that grants Amazon AppFlow access to the data
         * through the Amazon Redshift Data API.
         */
        DataApiRoleArn?: string;
        /** The unique identifier of the Amazon Redshift cluster. */
        ClusterIdentifier?: string;
        /** The name of the Amazon Redshift serverless workgroup */
        WorkgroupName?: string;
        /** The name of the Amazon Redshift database that will store the transferred data. */
        DatabaseName?: string;
      };
      SAPOData?: {
        ApplicationHostUrl?: string;
        ApplicationServicePath?: string;
        PortNumber?: number;
        ClientNumber?: string;
        LogonLanguage?: string;
        PrivateLinkServiceName?: string;
        OAuthProperties?: {
          /**
           * @maxLength 256
           * @pattern ^(https?)://[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]
           */
          AuthCodeUrl?: string;
          /**
           * @maxLength 256
           * @pattern ^(https?)://[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]
           */
          TokenUrl?: string;
          /** @uniqueItems true */
          OAuthScopes?: string[];
        };
        /**
         * If you set this parameter to true, Amazon AppFlow bypasses the single sign-on (SSO) settings in
         * your SAP account when it accesses your SAP OData instance.
         */
        DisableSSO?: boolean;
      };
      Salesforce?: {
        /** The location of the Salesforce resource */
        InstanceUrl?: string;
        /** Indicates whether the connector profile applies to a sandbox or production environment */
        isSandboxEnvironment?: boolean;
        /** Indicates whether to make Metadata And Authorization calls over Pivate Network */
        usePrivateLinkForMetadataAndAuthorization?: boolean;
      };
      Pardot?: {
        /** The location of the Salesforce Pardot resource */
        InstanceUrl?: string;
        /** Indicates whether the connector profile applies to a demo or production environment */
        IsSandboxEnvironment?: boolean;
        /** The Business unit id of Salesforce Pardot instance to be connected */
        BusinessUnitId: string;
      };
      ServiceNow?: {
        /** The location of the ServiceNow resource */
        InstanceUrl: string;
      };
      Slack?: {
        /** The location of the Slack resource */
        InstanceUrl: string;
      };
      Snowflake?: {
        /** The name of the Snowﬂake warehouse. */
        Warehouse: string;
        /**
         * The name of the Amazon S3 stage that was created while setting up an Amazon S3 stage in the
         * Snowﬂake account. This is written in the following format: < Database>< Schema><Stage Name>.
         */
        Stage: string;
        /** The name of the Amazon S3 bucket associated with Snowﬂake. */
        BucketName: string;
        /** The bucket prefix that refers to the Amazon S3 bucket associated with Snowﬂake. */
        BucketPrefix?: string;
        /** The Snowﬂake Private Link service name to be used for private data transfers. */
        PrivateLinkServiceName?: string;
        /** The name of the account. */
        AccountName?: string;
        /** The region of the Snowﬂake account. */
        Region?: string;
      };
      Veeva?: {
        /** The location of the Veeva resource */
        InstanceUrl: string;
      };
      Zendesk?: {
        /** The location of the Zendesk resource */
        InstanceUrl: string;
      };
      CustomConnector?: {
        ProfileProperties?: Record<string, string>;
        OAuth2Properties?: {
          /**
           * @minLength 0
           * @maxLength 256
           * @pattern ^(https?)://[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]
           */
          TokenUrl?: string;
          OAuth2GrantType?: "CLIENT_CREDENTIALS" | "AUTHORIZATION_CODE" | "JWT_BEARER";
          TokenUrlCustomProperties?: Record<string, string>;
        };
      };
    };
    ConnectorProfileCredentials?: {
      Amplitude?: {
        /**
         * A unique alphanumeric identiﬁer used to authenticate a user, developer, or calling program to your
         * API.
         */
        ApiKey: string;
        SecretKey: string;
      };
      Datadog?: {
        /**
         * A unique alphanumeric identiﬁer used to authenticate a user, developer, or calling program to your
         * API.
         */
        ApiKey: string;
        /**
         * Application keys, in conjunction with your API key, give you full access to Datadog’s programmatic
         * API. Application keys are associated with the user account that created them. The application key
         * is used to log all requests made to the API.
         */
        ApplicationKey: string;
      };
      Dynatrace?: {
        /** The API tokens used by Dynatrace API to authenticate various API calls. */
        ApiToken: string;
      };
      GoogleAnalytics?: {
        /** The identiﬁer for the desired client. */
        ClientId: string;
        /** The client secret used by the oauth client to authenticate to the authorization server. */
        ClientSecret: string;
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The credentials used to acquire new access tokens. */
        RefreshToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
      };
      InforNexus?: {
        /** The Access Key portion of the credentials. */
        AccessKeyId: string;
        /** The identiﬁer for the user. */
        UserId: string;
        /** The secret key used to sign requests. */
        SecretAccessKey: string;
        /** The encryption keys used to encrypt data. */
        Datakey: string;
      };
      Marketo?: {
        /** The identiﬁer for the desired client. */
        ClientId: string;
        /** The client secret used by the oauth client to authenticate to the authorization server. */
        ClientSecret: string;
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
      };
      Redshift?: {
        /** The name of the user. */
        Username?: string;
        /** The password that corresponds to the username. */
        Password?: string;
      };
      SAPOData?: {
        BasicAuthCredentials?: {
          Username: string;
          Password: string;
        };
        OAuthCredentials?: {
          AccessToken?: string;
          RefreshToken?: string;
          ConnectorOAuthRequest?: {
            /** The code provided by the connector when it has been authenticated via the connected app. */
            AuthCode?: string;
            /**
             * The URL to which the authentication server redirects the browser after authorization has been
             * granted.
             */
            RedirectUri?: string;
          };
          ClientId?: string;
          ClientSecret?: string;
        };
      };
      Salesforce?: {
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The credentials used to acquire new access tokens. */
        RefreshToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
        /** The client credentials to fetch access token and refresh token. */
        ClientCredentialsArn?: string;
        /** The grant types to fetch an access token */
        OAuth2GrantType?: "CLIENT_CREDENTIALS" | "AUTHORIZATION_CODE" | "JWT_BEARER";
        /** The credentials used to access your Salesforce records */
        JwtToken?: string;
      };
      Pardot?: {
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The credentials used to acquire new access tokens. */
        RefreshToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
        /** The client credentials to fetch access token and refresh token. */
        ClientCredentialsArn?: string;
      };
      ServiceNow?: {
        /** The name of the user. */
        Username?: string;
        /** The password that corresponds to the username. */
        Password?: string;
        /** The OAuth 2.0 credentials required to authenticate the user. */
        OAuth2Credentials?: {
          ClientId?: string;
          ClientSecret?: string;
          AccessToken?: string;
          RefreshToken?: string;
          OAuthRequest?: {
            /** The code provided by the connector when it has been authenticated via the connected app. */
            AuthCode?: string;
            /**
             * The URL to which the authentication server redirects the browser after authorization has been
             * granted.
             */
            RedirectUri?: string;
          };
        };
      };
      Singular?: {
        /**
         * A unique alphanumeric identiﬁer used to authenticate a user, developer, or calling program to your
         * API.
         */
        ApiKey: string;
      };
      Slack?: {
        /** The identiﬁer for the desired client. */
        ClientId: string;
        /** The client secret used by the oauth client to authenticate to the authorization server. */
        ClientSecret: string;
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
      };
      Snowflake?: {
        /** The name of the user. */
        Username: string;
        /** The password that corresponds to the username. */
        Password: string;
      };
      Trendmicro?: {
        /** The Secret Access Key portion of the credentials. */
        ApiSecretKey: string;
      };
      Veeva?: {
        /** The name of the user. */
        Username: string;
        /** The password that corresponds to the username. */
        Password: string;
      };
      Zendesk?: {
        /** The identiﬁer for the desired client. */
        ClientId: string;
        /** The client secret used by the oauth client to authenticate to the authorization server. */
        ClientSecret: string;
        /** The credentials used to access protected resources. */
        AccessToken?: string;
        /** The oauth needed to request security tokens from the connector endpoint. */
        ConnectorOAuthRequest?: {
          /** The code provided by the connector when it has been authenticated via the connected app. */
          AuthCode?: string;
          /**
           * The URL to which the authentication server redirects the browser after authorization has been
           * granted.
           */
          RedirectUri?: string;
        };
      };
      CustomConnector?: {
        AuthenticationType: "OAUTH2" | "APIKEY" | "BASIC" | "CUSTOM";
        Basic?: {
          Username: string;
          Password: string;
        };
        Oauth2?: {
          ClientId?: string;
          ClientSecret?: string;
          AccessToken?: string;
          RefreshToken?: string;
          OAuthRequest?: {
            /** The code provided by the connector when it has been authenticated via the connected app. */
            AuthCode?: string;
            /**
             * The URL to which the authentication server redirects the browser after authorization has been
             * granted.
             */
            RedirectUri?: string;
          };
        };
        ApiKey?: {
          ApiKey: string;
          ApiSecretKey?: string;
        };
        Custom?: {
          CustomAuthenticationType: string;
          CredentialsMap?: Record<string, string>;
        };
      };
    };
  };
  /**
   * A unique Arn for Connector-Profile resource
   * @maxLength 512
   * @pattern arn:aws:.*:.*:[0-9]+:.*
   */
  CredentialsArn?: string;
};
