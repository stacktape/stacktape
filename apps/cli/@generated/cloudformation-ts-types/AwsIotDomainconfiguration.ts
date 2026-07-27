// This file is auto-generated. Do not edit manually.
// Source: aws-iot-domainconfiguration.json

/** Create and manage a Domain Configuration */
export type AwsIotDomainconfiguration = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\w.-]+$
   */
  DomainConfigurationName?: string;
  AuthorizerConfig?: {
    AllowAuthorizerOverride?: boolean;
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[\w=,@-]+$
     */
    DefaultAuthorizerName?: string;
  };
  /**
   * @minLength 1
   * @maxLength 253
   */
  DomainName?: string;
  /**
   * @minItems 0
   * @maxItems 1
   */
  ServerCertificateArns?: string[];
  /** @enum ["DATA","CREDENTIAL_PROVIDER","JOBS"] */
  ServiceType?: "DATA" | "CREDENTIAL_PROVIDER" | "JOBS";
  /** @pattern ^arn:aws(-cn|-us-gov|-iso-b|-iso)?:acm:[a-z]{2}-(gov-|iso-|isob-)?[a-z]{4,9}-\d{1}:\d{12}:certificate/[a-zA-Z0-9/-]+$ */
  ValidationCertificateArn?: string;
  Arn?: string;
  /** @enum ["ENABLED","DISABLED"] */
  DomainConfigurationStatus?: "ENABLED" | "DISABLED";
  /** @enum ["ENDPOINT","AWS_MANAGED","CUSTOMER_MANAGED"] */
  DomainType?: "ENDPOINT" | "AWS_MANAGED" | "CUSTOMER_MANAGED";
  ServerCertificateConfig?: {
    EnableOCSPCheck?: boolean;
    /**
     * @minLength 1
     * @maxLength 170
     */
    OcspLambdaArn?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:aws(-cn|-us-gov|-iso-b|-iso)?:acm:[a-z]{2}-(gov-|iso-|isob-)?[a-z]{4,9}-\d{1}:\d{12}:certificate/[a-zA-Z0-9/-]+$
     */
    OcspAuthorizedResponderArn?: string;
  };
  ServerCertificates?: ({
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:aws(-cn|-us-gov|-iso-b|-iso)?:acm:[a-z]{2}-(gov-|iso-|isob-)?[a-z]{4,9}-\d{1}:\d{12}:certificate/[a-zA-Z0-9/-]+$
     */
    ServerCertificateArn?: string;
    /** @enum ["INVALID","VALID"] */
    ServerCertificateStatus?: "INVALID" | "VALID";
    ServerCertificateStatusDetail?: string;
  })[];
  TlsConfig?: {
    /** @maxLength 128 */
    SecurityPolicy?: string;
  };
  /** @enum ["AWS_X509","CUSTOM_AUTH","AWS_SIGV4","CUSTOM_AUTH_X509","DEFAULT"] */
  AuthenticationType?: "AWS_X509" | "CUSTOM_AUTH" | "AWS_SIGV4" | "CUSTOM_AUTH_X509" | "DEFAULT";
  /** @enum ["SECURE_MQTT","MQTT_WSS","HTTPS","DEFAULT"] */
  ApplicationProtocol?: "SECURE_MQTT" | "MQTT_WSS" | "HTTPS" | "DEFAULT";
  ClientCertificateConfig?: {
    /**
     * @minLength 1
     * @maxLength 170
     */
    ClientCertificateCallbackArn?: string;
  };
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
