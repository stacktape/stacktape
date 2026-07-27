// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-tlsinspectionconfiguration.json

/** Resource type definition for AWS::NetworkFirewall::TLSInspectionConfiguration */
export type AwsNetworkfirewallTlsinspectionconfiguration = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  TLSInspectionConfigurationName: string;
  TLSInspectionConfigurationArn?: string;
  TLSInspectionConfiguration: {
    /** @uniqueItems false */
    ServerCertificateConfigurations?: ({
      /** @uniqueItems true */
      ServerCertificates?: {
        ResourceArn?: string;
      }[];
      /** @uniqueItems false */
      Scopes?: {
        /** @uniqueItems false */
        Sources?: {
          /**
           * @minLength 1
           * @maxLength 255
           * @pattern ^([a-fA-F\d:\.]+/\d{1,3})$
           */
          AddressDefinition: string;
        }[];
        /** @uniqueItems false */
        Destinations?: {
          /**
           * @minLength 1
           * @maxLength 255
           * @pattern ^([a-fA-F\d:\.]+/\d{1,3})$
           */
          AddressDefinition: string;
        }[];
        /** @uniqueItems false */
        SourcePorts?: {
          FromPort: number;
          ToPort: number;
        }[];
        /** @uniqueItems false */
        DestinationPorts?: {
          FromPort: number;
          ToPort: number;
        }[];
        /** @uniqueItems false */
        Protocols?: number[];
      }[];
      CertificateAuthorityArn?: string;
      CheckCertificateRevocationStatus?: {
        RevokedStatusAction?: "PASS" | "DROP" | "REJECT";
        UnknownStatusAction?: "PASS" | "DROP" | "REJECT";
      };
    })[];
  };
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^([0-9a-f]{8})-([0-9a-f]{4}-){3}([0-9a-f]{12})$
   */
  TLSInspectionConfigurationId?: string;
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern ^.*$
   */
  Description?: string;
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^.*$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 255
     * @pattern ^.*$
     */
    Value: string;
  }[];
};
