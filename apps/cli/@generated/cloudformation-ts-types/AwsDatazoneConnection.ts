// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-connection.json

/**
 * Connections enables users to connect their DataZone resources (domains, projects, and environments)
 * to external resources/services (data, compute, etc)
 */
export type AwsDatazoneConnection = {
  AwsLocation?: {
    /**
     * @maxLength 2048
     * @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$
     */
    AccessRole?: string;
    /** @pattern ^\d{12}$ */
    AwsAccountId?: string;
    /** @pattern ^[a-z]{2}-[a-z]{4,10}-\d$ */
    AwsRegion?: string;
    /**
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9]+$
     */
    IamConnectionId?: string;
  };
  /**
   * The ID of the connection.
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9]+$
   */
  ConnectionId?: string;
  /**
   * The description of the connection.
   * @maxLength 128
   * @pattern ^[\S\s]*$
   */
  Description?: string;
  /**
   * The ID of the domain in which the connection is created.
   * @pattern ^dzd[_-][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The identifier of the domain in which the connection is created.
   * @pattern ^dzd[_-][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The ID of the domain unit in which the connection is created.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_\-]+$
   */
  DomainUnitId?: string;
  /** Specifies whether the trusted identity propagation is enabled */
  EnableTrustedIdentityPropagation?: boolean;
  /**
   * The ID of the environment in which the connection is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentId?: string;
  /** The identifier of the environment in which the connection is created. */
  EnvironmentIdentifier?: string;
  /** The identifier of the project in which the connection should be created. If */
  ProjectIdentifier?: string;
  /** The role of the user in the environment. */
  EnvironmentUserRole?: string;
  /**
   * The name of the connection.
   * @maxLength 64
   * @pattern ^[\w][\w\.\-\_]*$
   */
  Name: string;
  /**
   * The ID of the project in which the connection is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectId?: string;
  Props?: {
    AthenaProperties: {
      /**
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9._-]+$
       */
      WorkgroupName: string;
    };
  } | {
    GlueProperties: {
      GlueConnectionInput?: {
        ConnectionProperties?: Record<string, string>;
        PhysicalConnectionRequirements?: {
          /**
           * @maxLength 32
           * @pattern ^subnet-[a-z0-9]+$
           */
          SubnetId?: string;
          /**
           * @minItems 1
           * @maxItems 50
           */
          SubnetIdList?: string[];
          /**
           * @minItems 0
           * @maxItems 50
           */
          SecurityGroupIdList?: string[];
          /**
           * @minLength 1
           * @maxLength 255
           */
          AvailabilityZone?: string;
        };
        /**
         * @minLength 1
         * @maxLength 255
         * @pattern ^[\u0020-\uD7FF\uE000-\uFFFF\t]*$
         */
        Name?: string;
        /**
         * @maxLength 2048
         * @pattern ^[\u0020-\uD7FF\uE000-\uFFFF\r\n\t]*$
         */
        Description?: string;
        ConnectionType?: string;
        /**
         * @minLength 0
         * @maxLength 10
         */
        MatchCriteria?: string;
        ValidateCredentials?: boolean;
        /**
         * @minItems 1
         * @maxItems 50
         */
        ValidateForComputeEnvironments?: string[];
        SparkProperties?: Record<string, string>;
        AthenaProperties?: Record<string, string>;
        PythonProperties?: Record<string, string>;
        AuthenticationConfiguration?: {
          AuthenticationType?: "BASIC" | "OAUTH2" | "CUSTOM";
          OAuth2Properties?: {
            OAuth2GrantType?: "AUTHORIZATION_CODE" | "CLIENT_CREDENTIALS" | "JWT_BEARER";
            OAuth2ClientApplication?: {
              /**
               * @maxLength 2048
               * @pattern ^\S+$
               */
              UserManagedClientApplicationClientId?: string;
              /**
               * @maxLength 2048
               * @pattern ^\S+$
               */
              AWSManagedClientApplicationReference?: string;
            };
            /**
             * @maxLength 256
             * @pattern ^(https?)://[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]$
             */
            TokenUrl?: string;
            TokenUrlParametersMap?: Record<string, string>;
            AuthorizationCodeProperties?: {
              /**
               * @minLength 1
               * @maxLength 4096
               */
              AuthorizationCode?: string;
              /** @maxLength 512 */
              RedirectUri?: string;
            };
            OAuth2Credentials?: {
              /**
               * @maxLength 512
               * @pattern ^[\x20-\x7E]*$
               */
              UserManagedClientApplicationClientSecret?: string;
              /**
               * @maxLength 4096
               * @pattern ^[\x20-\x7E]*$
               */
              AccessToken?: string;
              /**
               * @maxLength 4096
               * @pattern ^[\x20-\x7E]*$
               */
              RefreshToken?: string;
              /**
               * @maxLength 8000
               * @pattern ^([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_\-\+\/=]*)$
               */
              JwtToken?: string;
            };
          };
          /** @pattern ^arn:aws(-(cn|us-gov|iso(-[bef])?))?:secretsmanager:.*$ */
          SecretArn?: string;
          /** @pattern ^$|arn:aws[a-z0-9-]*:kms:.*$ */
          KmsKeyArn?: string;
          BasicAuthenticationCredentials?: {
            /**
             * @maxLength 512
             * @pattern ^\S+$
             */
            UserName?: string;
            /**
             * @maxLength 512
             * @pattern ^.*$
             */
            Password?: string;
          };
          CustomAuthenticationCredentials?: Record<string, string>;
        };
      };
    };
  } | {
    HyperPodProperties: {
      /**
       * @minLength 1
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*$
       */
      ClusterName: string;
    };
  } | {
    IamProperties: {
      GlueLineageSyncEnabled?: boolean;
    };
  } | {
    RedshiftProperties: {
      Storage?: {
        /**
         * @minLength 0
         * @maxLength 63
         * @pattern ^[a-z0-9-]+$
         */
        ClusterName: string;
      } | {
        /**
         * @minLength 3
         * @maxLength 64
         * @pattern ^[a-z0-9-]+$
         */
        WorkgroupName: string;
      };
      /**
       * @minLength 1
       * @maxLength 64
       * @pattern ^[a-z0-9_-]+$
       */
      DatabaseName?: string;
      /**
       * @maxLength 256
       * @pattern ^[\S]*$
       */
      Host?: string;
      /**
       * @minimum 0
       * @maximum 65535
       */
      Port?: number;
      Credentials?: {
        /**
         * @maxLength 2048
         * @pattern ^arn:aws[^:]*:secretsmanager:[a-z]{2}-?(iso|gov)?-{1}[a-z]*-{1}[0-9]:\d{12}:secret:.*$
         */
        SecretArn: string;
      } | {
        UsernamePassword: {
          /**
           * @maxLength 64
           * @pattern ^[\S]*$
           */
          Password: string;
          /**
           * @minLength 1
           * @maxLength 127
           * @pattern ^[\S]*$
           */
          Username: string;
        };
      };
      LineageSync?: {
        Enabled?: boolean;
        Schedule?: {
          /** @pattern ^cron\((\b[0-5]?[0-9]\b) (\b2[0-3]\b|\b[0-1]?[0-9]\b) ([-?*,/\dLW]){1,83} ([-*,/\d]|[a-zA-Z]{3}){1,23} ([-?#*,/\dL]|[a-zA-Z]{3}){1,13} ([^\)]+)\)$ */
          Schedule?: string;
        };
      };
    };
  } | {
    SparkEmrProperties: {
      /**
       * @maxLength 2048
       * @pattern ^arn:aws(-(cn|us-gov|iso(-[bef])?))?:(elasticmapreduce|emr-serverless):.*
       */
      ComputeArn?: string;
      /**
       * @maxLength 2048
       * @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$
       */
      InstanceProfileArn?: string;
      /**
       * @maxLength 256
       * @pattern ^[\S]*$
       */
      JavaVirtualEnv?: string;
      /**
       * @maxLength 2048
       * @pattern ^s3://.+$
       */
      LogUri?: string;
      /**
       * @maxLength 256
       * @pattern ^[\S]*$
       */
      PythonVirtualEnv?: string;
      /**
       * @maxLength 2048
       * @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$
       */
      RuntimeRole?: string;
      /**
       * @maxLength 2048
       * @pattern ^s3://.+$
       */
      TrustedCertificatesS3Uri?: string;
    };
  } | {
    AmazonQProperties: {
      /** Specifies whether Amazon Q is enabled for the connection */
      IsEnabled?: boolean;
      /**
       * The authentication mode of the connection's AmazonQ properties
       * @minLength 0
       * @maxLength 128
       */
      AuthMode?: string;
      /**
       * @minLength 0
       * @maxLength 2048
       * @pattern arn:aws[a-z\-]*:[a-z0-9\-]+:[a-z0-9\-]*:[0-9]*:.*
       */
      ProfileArn?: string;
    };
  } | {
    SparkGlueProperties: {
      AdditionalArgs?: {
        /**
         * @maxLength 128
         * @pattern ^[a-zA-Z0-9]+$
         */
        Connection?: string;
      };
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern ^[\S]*$
       */
      GlueConnectionName?: string;
      /**
       * @maxLength 256
       * @pattern ^\w+\.\w+$
       */
      GlueVersion?: string;
      /**
       * @minimum 1
       * @maximum 3000
       */
      IdleTimeout?: number;
      /**
       * @maxLength 256
       * @pattern ^[\S]*$
       */
      JavaVirtualEnv?: string;
      /**
       * @minimum 1
       * @maximum 1000
       */
      NumberOfWorkers?: number;
      /**
       * @maxLength 256
       * @pattern ^[\S]*$
       */
      PythonVirtualEnv?: string;
      /**
       * @maxLength 256
       * @pattern ^[G|Z].*$
       */
      WorkerType?: string;
    };
  } | {
    S3Properties: {
      /**
       * The Amazon S3 URI that's part of the Amazon S3 properties of a connection.
       * @minLength 0
       * @maxLength 2048
       * @pattern s3://.+
       */
      S3Uri: string;
      /**
       * The Amazon S3 Access Grant location ID that's part of the Amazon S3 properties of a connection.
       * @minLength 0
       * @maxLength 64
       * @pattern [a-zA-Z0-9\-]+
       */
      S3AccessGrantLocationId?: string;
    };
  };
  Type?: string;
  /**
   * The scope of the connection.
   * @enum ["DOMAIN","PROJECT"]
   */
  Scope?: "DOMAIN" | "PROJECT";
};
