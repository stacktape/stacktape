// This file is auto-generated. Do not edit manually.
// Source: aws-glue-connection.json

/** Resource Type definition for AWS::Glue::Connection */
export type AwsGlueConnection = {
  ConnectionInput: {
    AuthenticationConfiguration?: {
      SecretArn?: string;
      KmsKeyArn?: string;
      OAuth2Properties?: {
        AuthorizationCodeProperties?: {
          AuthorizationCode?: string;
          RedirectUri?: string;
        };
        OAuth2ClientApplication?: {
          AWSManagedClientApplicationReference?: string;
          UserManagedClientApplicationClientId?: string;
        };
        TokenUrl?: string;
        OAuth2Credentials?: {
          UserManagedClientApplicationClientSecret?: string;
          JwtToken?: string;
          RefreshToken?: string;
          AccessToken?: string;
        };
        OAuth2GrantType?: string;
        TokenUrlParametersMap?: Record<string, unknown>;
      };
      CustomAuthenticationCredentials?: Record<string, unknown>;
      BasicAuthenticationCredentials?: {
        Username?: string;
        Password?: string;
      };
      AuthenticationType: string;
    };
    PythonProperties?: Record<string, unknown>;
    Description?: string;
    ConnectionType: string;
    /** @uniqueItems false */
    MatchCriteria?: string[];
    ConnectionProperties?: Record<string, unknown>;
    AthenaProperties?: Record<string, unknown>;
    /** @uniqueItems false */
    ValidateForComputeEnvironments?: string[];
    Name?: string;
    SparkProperties?: Record<string, unknown>;
    PhysicalConnectionRequirements?: {
      AvailabilityZone?: string;
      /** @uniqueItems false */
      SecurityGroupIdList?: string[];
      SubnetId?: string;
    };
    ValidateCredentials?: boolean;
  };
  CatalogId: string;
  Id?: string;
};
