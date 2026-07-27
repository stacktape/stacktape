// This file is auto-generated. Do not edit manually.
// Source: aws-acmpca-certificateauthority.json

/** Private certificate authority. */
export type AwsAcmpcaCertificateauthority = {
  /** The Amazon Resource Name (ARN) of the certificate authority. */
  Arn?: string;
  /** The type of the certificate authority. */
  Type: string;
  /**
   * Public key algorithm and size, in bits, of the key pair that your CA creates when it issues a
   * certificate.
   */
  KeyAlgorithm: string;
  /** Algorithm your CA uses to sign certificate requests. */
  SigningAlgorithm: string;
  /** Structure that contains X.500 distinguished name information for your CA. */
  Subject: {
    Country?: string;
    Organization?: string;
    OrganizationalUnit?: string;
    DistinguishedNameQualifier?: string;
    State?: string;
    CommonName?: string;
    SerialNumber?: string;
    Locality?: string;
    Title?: string;
    Surname?: string;
    GivenName?: string;
    Initials?: string;
    Pseudonym?: string;
    GenerationQualifier?: string;
    CustomAttributes?: {
      ObjectIdentifier: string;
      Value: string;
    }[];
  };
  /**
   * Certificate revocation information used by the CreateCertificateAuthority and
   * UpdateCertificateAuthority actions.
   */
  RevocationConfiguration?: {
    CrlConfiguration?: {
      Enabled: boolean;
      ExpirationInDays?: number;
      CustomCname?: string;
      S3BucketName?: string;
      S3ObjectAcl?: string;
      CrlDistributionPointExtensionConfiguration?: {
        OmitExtension: boolean;
      };
      CrlType?: string;
      CustomPath?: string;
    };
    OcspConfiguration?: {
      Enabled: boolean;
      OcspCustomCname?: string;
    };
  };
  Tags?: {
    Key: string;
    Value?: string;
  }[];
  /**
   * The base64 PEM-encoded certificate signing request (CSR) for your certificate authority
   * certificate.
   */
  CertificateSigningRequest?: string;
  /**
   * Structure that contains CSR pass through extension information used by the
   * CreateCertificateAuthority action.
   */
  CsrExtensions?: {
    KeyUsage?: {
      /** @default false */
      DigitalSignature?: boolean;
      /** @default false */
      NonRepudiation?: boolean;
      /** @default false */
      KeyEncipherment?: boolean;
      /** @default false */
      DataEncipherment?: boolean;
      /** @default false */
      KeyAgreement?: boolean;
      /** @default false */
      KeyCertSign?: boolean;
      /** @default false */
      CRLSign?: boolean;
      /** @default false */
      EncipherOnly?: boolean;
      /** @default false */
      DecipherOnly?: boolean;
    };
    SubjectInformationAccess?: {
      AccessMethod: {
        CustomObjectIdentifier?: string;
        AccessMethodType?: string;
      };
      AccessLocation: {
        OtherName?: {
          TypeId: string;
          Value: string;
        };
        Rfc822Name?: string;
        DnsName?: string;
        DirectoryName?: {
          Country?: string;
          Organization?: string;
          OrganizationalUnit?: string;
          DistinguishedNameQualifier?: string;
          State?: string;
          CommonName?: string;
          SerialNumber?: string;
          Locality?: string;
          Title?: string;
          Surname?: string;
          GivenName?: string;
          Initials?: string;
          Pseudonym?: string;
          GenerationQualifier?: string;
          CustomAttributes?: {
            ObjectIdentifier: string;
            Value: string;
          }[];
        };
        EdiPartyName?: {
          PartyName: string;
          NameAssigner?: string;
        };
        UniformResourceIdentifier?: string;
        IpAddress?: string;
        RegisteredId?: string;
      };
    }[];
  };
  /**
   * KeyStorageSecurityStadard defines a cryptographic key management compliance standard used for
   * handling CA keys.
   */
  KeyStorageSecurityStandard?: string;
  /** Usage mode of the ceritificate authority. */
  UsageMode?: string;
};
