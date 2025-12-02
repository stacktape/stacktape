// This file is auto-generated. Do not edit manually.
// Source: aws-acmpca-certificate.json

/**
 * The ``AWS::ACMPCA::Certificate`` resource is used to issue a certificate using your private
 * certificate authority. For more information, see the
 * [IssueCertificate](https://docs.aws.amazon.com/privateca/latest/APIReference/API_IssueCertificate.html)
 * action.
 */
export type AwsAcmpcaCertificate = {
  /**
   * Specifies X.509 certificate information to be included in the issued certificate. An
   * ``APIPassthrough`` or ``APICSRPassthrough`` template variant must be selected, or else this
   * parameter is ignored.
   */
  ApiPassthrough?: {
    /** Specifies X.509 extension information for a certificate. */
    Extensions?: {
      /**
       * Contains a sequence of one or more policy information terms, each of which consists of an object
       * identifier (OID) and optional qualifiers. For more information, see NIST's definition of [Object
       * Identifier
       * (OID)](https://docs.aws.amazon.com/https://csrc.nist.gov/glossary/term/Object_Identifier).
       * In an end-entity certificate, these terms indicate the policy under which the certificate was
       * issued and the purposes for which it may be used. In a CA certificate, these terms limit the set of
       * policies for certification paths that include this certificate.
       */
      CertificatePolicies?: {
        /**
         * Specifies the object identifier (OID) of the certificate policy under which the certificate was
         * issued. For more information, see NIST's definition of [Object Identifier
         * (OID)](https://docs.aws.amazon.com/https://csrc.nist.gov/glossary/term/Object_Identifier).
         */
        CertPolicyId: string;
        /**
         * Modifies the given ``CertPolicyId`` with a qualifier. AWS Private CA supports the certification
         * practice statement (CPS) qualifier.
         */
        PolicyQualifiers?: {
          /** Identifies the qualifier modifying a ``CertPolicyId``. */
          PolicyQualifierId: string;
          /**
           * Defines the qualifier type. AWS Private CA supports the use of a URI for a CPS qualifier in this
           * field.
           */
          Qualifier: {
            /** Contains a pointer to a certification practice statement (CPS) published by the CA. */
            CpsUri: string;
          };
        }[];
      }[];
      /**
       * Specifies additional purposes for which the certified public key may be used other than basic
       * purposes indicated in the ``KeyUsage`` extension.
       */
      ExtendedKeyUsage?: {
        /**
         * Specifies a standard ``ExtendedKeyUsage`` as defined as in [RFC
         * 5280](https://docs.aws.amazon.com/https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.12).
         */
        ExtendedKeyUsageType?: string;
        /** Specifies a custom ``ExtendedKeyUsage`` with an object identifier (OID). */
        ExtendedKeyUsageObjectIdentifier?: string;
      }[];
      /**
       * Defines one or more purposes for which the key contained in the certificate can be used. Default
       * value for each option is false.
       */
      KeyUsage?: {
        /**
         * Key can be used for digital signing.
         * @default false
         */
        DigitalSignature?: boolean;
        /**
         * Key can be used for non-repudiation.
         * @default false
         */
        NonRepudiation?: boolean;
        /**
         * Key can be used to encipher data.
         * @default false
         */
        KeyEncipherment?: boolean;
        /**
         * Key can be used to decipher data.
         * @default false
         */
        DataEncipherment?: boolean;
        /**
         * Key can be used in a key-agreement protocol.
         * @default false
         */
        KeyAgreement?: boolean;
        /**
         * Key can be used to sign certificates.
         * @default false
         */
        KeyCertSign?: boolean;
        /**
         * Key can be used to sign CRLs.
         * @default false
         */
        CRLSign?: boolean;
        /**
         * Key can be used only to encipher data.
         * @default false
         */
        EncipherOnly?: boolean;
        /**
         * Key can be used only to decipher data.
         * @default false
         */
        DecipherOnly?: boolean;
      };
      /**
       * The subject alternative name extension allows identities to be bound to the subject of the
       * certificate. These identities may be included in addition to or in place of the identity in the
       * subject field of the certificate.
       */
      SubjectAlternativeNames?: {
        /** Represents ``GeneralName`` using an ``OtherName`` object. */
        OtherName?: {
          /** Specifies an OID. */
          TypeId: string;
          /** Specifies an OID value. */
          Value: string;
        };
        /**
         * Represents ``GeneralName`` as an [RFC
         * 822](https://docs.aws.amazon.com/https://datatracker.ietf.org/doc/html/rfc822) email address.
         */
        Rfc822Name?: string;
        /** Represents ``GeneralName`` as a DNS name. */
        DnsName?: string;
        /**
         * Contains information about the certificate subject. The certificate can be one issued by your
         * private certificate authority (CA) or it can be your private CA certificate. The Subject field in
         * the certificate identifies the entity that owns or controls the public key in the certificate. The
         * entity can be a user, computer, device, or service. The Subject must contain an X.500 distinguished
         * name (DN). A DN is a sequence of relative distinguished names (RDNs). The RDNs are separated by
         * commas in the certificate. The DN must be unique for each entity, but your private CA can issue
         * more than one certificate with the same DN to the same entity.
         */
        DirectoryName?: {
          /** Two-digit code that specifies the country in which the certificate subject located. */
          Country?: string;
          /** Legal name of the organization with which the certificate subject is affiliated. */
          Organization?: string;
          /**
           * A subdivision or unit of the organization (such as sales or finance) with which the certificate
           * subject is affiliated.
           */
          OrganizationalUnit?: string;
          /** Disambiguating information for the certificate subject. */
          DistinguishedNameQualifier?: string;
          /** State in which the subject of the certificate is located. */
          State?: string;
          /**
           * For CA and end-entity certificates in a private PKI, the common name (CN) can be any string within
           * the length limit.
           * Note: In publicly trusted certificates, the common name must be a fully qualified domain name
           * (FQDN) associated with the certificate subject.
           */
          CommonName?: string;
          /** The certificate serial number. */
          SerialNumber?: string;
          /** The locality (such as a city or town) in which the certificate subject is located. */
          Locality?: string;
          /**
           * A title such as Mr. or Ms., which is pre-pended to the name to refer formally to the certificate
           * subject.
           */
          Title?: string;
          /**
           * Family name. In the US and the UK, for example, the surname of an individual is ordered last. In
           * Asian cultures the surname is typically ordered first.
           */
          Surname?: string;
          /** First name. */
          GivenName?: string;
          /**
           * Concatenation that typically contains the first letter of the *GivenName*, the first letter of the
           * middle name if one exists, and the first letter of the *Surname*.
           */
          Initials?: string;
          /**
           * Typically a shortened version of a longer *GivenName*. For example, Jonathan is often shortened to
           * John. Elizabeth is often shortened to Beth, Liz, or Eliza.
           */
          Pseudonym?: string;
          /**
           * Typically a qualifier appended to the name of an individual. Examples include Jr. for junior, Sr.
           * for senior, and III for third.
           */
          GenerationQualifier?: string;
          /**
           * Contains a sequence of one or more X.500 relative distinguished names (RDNs), each of which
           * consists of an object identifier (OID) and a value. For more information, see NIST’s definition of
           * [Object Identifier
           * (OID)](https://docs.aws.amazon.com/https://csrc.nist.gov/glossary/term/Object_Identifier).
           * Custom attributes cannot be used in combination with standard attributes.
           */
          CustomAttributes?: {
            /**
             * Specifies the object identifier (OID) of the attribute type of the relative distinguished name
             * (RDN).
             */
            ObjectIdentifier: string;
            /** Specifies the attribute value of relative distinguished name (RDN). */
            Value: string;
          }[];
        };
        /** Represents ``GeneralName`` as an ``EdiPartyName`` object. */
        EdiPartyName?: {
          /** Specifies the party name. */
          PartyName: string;
          /** Specifies the name assigner. */
          NameAssigner: string;
        };
        /** Represents ``GeneralName`` as a URI. */
        UniformResourceIdentifier?: string;
        /** Represents ``GeneralName`` as an IPv4 or IPv6 address. */
        IpAddress?: string;
        /** Represents ``GeneralName`` as an object identifier (OID). */
        RegisteredId?: string;
      }[];
      /**
       * Contains a sequence of one or more X.509 extensions, each of which consists of an object identifier
       * (OID), a base64-encoded value, and the critical flag. For more information, see the [Global OID
       * reference database.](https://docs.aws.amazon.com/https://oidref.com/2.5.29)
       */
      CustomExtensions?: {
        /** Specifies the critical flag of the X.509 extension. */
        Critical?: boolean;
        /**
         * Specifies the object identifier (OID) of the X.509 extension. For more information, see the [Global
         * OID reference database.](https://docs.aws.amazon.com/https://oidref.com/2.5.29)
         */
        ObjectIdentifier: string;
        /** Specifies the base64-encoded value of the X.509 extension. */
        Value: string;
      }[];
    };
    /**
     * Contains information about the certificate subject. The Subject field in the certificate identifies
     * the entity that owns or controls the public key in the certificate. The entity can be a user,
     * computer, device, or service. The Subject must contain an X.500 distinguished name (DN). A DN is a
     * sequence of relative distinguished names (RDNs). The RDNs are separated by commas in the
     * certificate.
     */
    Subject?: {
      /** Two-digit code that specifies the country in which the certificate subject located. */
      Country?: string;
      /** Legal name of the organization with which the certificate subject is affiliated. */
      Organization?: string;
      /**
       * A subdivision or unit of the organization (such as sales or finance) with which the certificate
       * subject is affiliated.
       */
      OrganizationalUnit?: string;
      /** Disambiguating information for the certificate subject. */
      DistinguishedNameQualifier?: string;
      /** State in which the subject of the certificate is located. */
      State?: string;
      /**
       * For CA and end-entity certificates in a private PKI, the common name (CN) can be any string within
       * the length limit.
       * Note: In publicly trusted certificates, the common name must be a fully qualified domain name
       * (FQDN) associated with the certificate subject.
       */
      CommonName?: string;
      /** The certificate serial number. */
      SerialNumber?: string;
      /** The locality (such as a city or town) in which the certificate subject is located. */
      Locality?: string;
      /**
       * A title such as Mr. or Ms., which is pre-pended to the name to refer formally to the certificate
       * subject.
       */
      Title?: string;
      /**
       * Family name. In the US and the UK, for example, the surname of an individual is ordered last. In
       * Asian cultures the surname is typically ordered first.
       */
      Surname?: string;
      /** First name. */
      GivenName?: string;
      /**
       * Concatenation that typically contains the first letter of the *GivenName*, the first letter of the
       * middle name if one exists, and the first letter of the *Surname*.
       */
      Initials?: string;
      /**
       * Typically a shortened version of a longer *GivenName*. For example, Jonathan is often shortened to
       * John. Elizabeth is often shortened to Beth, Liz, or Eliza.
       */
      Pseudonym?: string;
      /**
       * Typically a qualifier appended to the name of an individual. Examples include Jr. for junior, Sr.
       * for senior, and III for third.
       */
      GenerationQualifier?: string;
      /**
       * Contains a sequence of one or more X.500 relative distinguished names (RDNs), each of which
       * consists of an object identifier (OID) and a value. For more information, see NIST’s definition of
       * [Object Identifier
       * (OID)](https://docs.aws.amazon.com/https://csrc.nist.gov/glossary/term/Object_Identifier).
       * Custom attributes cannot be used in combination with standard attributes.
       */
      CustomAttributes?: {
        /**
         * Specifies the object identifier (OID) of the attribute type of the relative distinguished name
         * (RDN).
         */
        ObjectIdentifier: string;
        /** Specifies the attribute value of relative distinguished name (RDN). */
        Value: string;
      }[];
    };
  };
  /** The Amazon Resource Name (ARN) for the private CA issues the certificate. */
  CertificateAuthorityArn: string;
  /**
   * The certificate signing request (CSR) for the certificate.
   * @minLength 1
   */
  CertificateSigningRequest: string;
  /**
   * The name of the algorithm that will be used to sign the certificate to be issued.
   * This parameter should not be confused with the ``SigningAlgorithm`` parameter used to sign a CSR
   * in the ``CreateCertificateAuthority`` action.
   * The specified signing algorithm family (RSA or ECDSA) must match the algorithm family of the CA's
   * secret key.
   */
  SigningAlgorithm: string;
  /**
   * Specifies a custom configuration template to use when issuing a certificate. If this parameter is
   * not provided, PCAshort defaults to the ``EndEntityCertificate/V1`` template. For more information
   * about PCAshort templates, see [Using
   * Templates](https://docs.aws.amazon.com/privateca/latest/userguide/UsingTemplates.html).
   */
  TemplateArn?: string;
  /** The period of time during which the certificate will be valid. */
  Validity: {
    /** A long integer interpreted according to the value of ``Type``, below. */
    Value: number;
    /** Specifies whether the ``Value`` parameter represents days, months, or years. */
    Type: string;
  };
  /**
   * Information describing the start of the validity period of the certificate. This parameter sets the
   * “Not Before" date for the certificate.
   * By default, when issuing a certificate, PCAshort sets the "Not Before" date to the issuance time
   * minus 60 minutes. This compensates for clock inconsistencies across computer systems. The
   * ``ValidityNotBefore`` parameter can be used to customize the “Not Before” value.
   * Unlike the ``Validity`` parameter, the ``ValidityNotBefore`` parameter is optional.
   * The ``ValidityNotBefore`` value is expressed as an explicit date and time, using the ``Validity``
   * type value ``ABSOLUTE``.
   */
  ValidityNotBefore?: {
    /** A long integer interpreted according to the value of ``Type``, below. */
    Value: number;
    /** Specifies whether the ``Value`` parameter represents days, months, or years. */
    Type: string;
  };
  Certificate?: string;
  Arn?: string;
};
