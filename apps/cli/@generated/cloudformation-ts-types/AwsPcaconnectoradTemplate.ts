// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorad-template.json

/**
 * Represents a template that defines certificate configurations, both for issuance and client
 * handling
 */
export type AwsPcaconnectoradTemplate = {
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  ConnectorArn: string;
  Definition: {
    TemplateV2: {
      CertificateValidity: {
        ValidityPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
        RenewalPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
      };
      /**
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      SupersededTemplates?: string[];
      PrivateKeyAttributes: {
        /** @minimum 1 */
        MinimalKeyLength: number;
        KeySpec: "KEY_EXCHANGE" | "SIGNATURE";
        /**
         * @minItems 1
         * @maxItems 100
         * @uniqueItems true
         */
        CryptoProviders?: string[];
      };
      PrivateKeyFlags: {
        ExportableKey?: boolean;
        StrongKeyProtectionRequired?: boolean;
        ClientVersion: "WINDOWS_SERVER_2003" | "WINDOWS_SERVER_2008" | "WINDOWS_SERVER_2008_R2" | "WINDOWS_SERVER_2012" | "WINDOWS_SERVER_2012_R2" | "WINDOWS_SERVER_2016";
      };
      EnrollmentFlags: {
        IncludeSymmetricAlgorithms?: boolean;
        UserInteractionRequired?: boolean;
        RemoveInvalidCertificateFromPersonalStore?: boolean;
        NoSecurityExtension?: boolean;
        EnableKeyReuseOnNtTokenKeysetStorageFull?: boolean;
      };
      SubjectNameFlags: {
        SanRequireDomainDns?: boolean;
        SanRequireSpn?: boolean;
        SanRequireDirectoryGuid?: boolean;
        SanRequireUpn?: boolean;
        SanRequireEmail?: boolean;
        SanRequireDns?: boolean;
        RequireDnsAsCn?: boolean;
        RequireEmail?: boolean;
        RequireCommonName?: boolean;
        RequireDirectoryPath?: boolean;
      };
      GeneralFlags: {
        AutoEnrollment?: boolean;
        MachineType?: boolean;
      };
      Extensions: {
        KeyUsage: {
          Critical?: boolean;
          UsageFlags: {
            DigitalSignature?: boolean;
            NonRepudiation?: boolean;
            KeyEncipherment?: boolean;
            DataEncipherment?: boolean;
            KeyAgreement?: boolean;
          };
        };
        ApplicationPolicies?: {
          Critical?: boolean;
          /**
           * @minItems 1
           * @maxItems 100
           * @uniqueItems true
           */
          Policies: ({
            PolicyType: "ALL_APPLICATION_POLICIES" | "ANY_PURPOSE" | "ATTESTATION_IDENTITY_KEY_CERTIFICATE" | "CERTIFICATE_REQUEST_AGENT" | "CLIENT_AUTHENTICATION" | "CODE_SIGNING" | "CTL_USAGE" | "DIGITAL_RIGHTS" | "DIRECTORY_SERVICE_EMAIL_REPLICATION" | "DISALLOWED_LIST" | "DNS_SERVER_TRUST" | "DOCUMENT_ENCRYPTION" | "DOCUMENT_SIGNING" | "DYNAMIC_CODE_GENERATOR" | "EARLY_LAUNCH_ANTIMALWARE_DRIVER" | "EMBEDDED_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "ENCLAVE" | "ENCRYPTING_FILE_SYSTEM" | "ENDORSEMENT_KEY_CERTIFICATE" | "FILE_RECOVERY" | "HAL_EXTENSION" | "IP_SECURITY_END_SYSTEM" | "IP_SECURITY_IKE_INTERMEDIATE" | "IP_SECURITY_TUNNEL_TERMINATION" | "IP_SECURITY_USER" | "ISOLATED_USER_MODE" | "KDC_AUTHENTICATION" | "KERNEL_MODE_CODE_SIGNING" | "KEY_PACK_LICENSES" | "KEY_RECOVERY" | "KEY_RECOVERY_AGENT" | "LICENSE_SERVER_VERIFICATION" | "LIFETIME_SIGNING" | "MICROSOFT_PUBLISHER" | "MICROSOFT_TIME_STAMPING" | "MICROSOFT_TRUST_LIST_SIGNING" | "OCSP_SIGNING" | "OEM_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "PLATFORM_CERTIFICATE" | "PREVIEW_BUILD_SIGNING" | "PRIVATE_KEY_ARCHIVAL" | "PROTECTED_PROCESS_LIGHT_VERIFICATION" | "PROTECTED_PROCESS_VERIFICATION" | "QUALIFIED_SUBORDINATION" | "REVOKED_LIST_SIGNER" | "ROOT_PROGRAM_AUTO_UPDATE_CA_REVOCATION" | "ROOT_PROGRAM_AUTO_UPDATE_END_REVOCATION" | "ROOT_PROGRAM_NO_OSCP_FAILOVER_TO_CRL" | "ROOT_LIST_SIGNER" | "SECURE_EMAIL" | "SERVER_AUTHENTICATION" | "SMART_CARD_LOGIN" | "SPC_ENCRYPTED_DIGEST_RETRY_COUNT" | "SPC_RELAXED_PE_MARKER_CHECK" | "TIME_STAMPING" | "WINDOWS_HARDWARE_DRIVER_ATTESTED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_EXTENDED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_VERIFICATION" | "WINDOWS_HELLO_RECOVERY_KEY_ENCRYPTION" | "WINDOWS_KITS_COMPONENT" | "WINDOWS_RT_VERIFICATION" | "WINDOWS_SOFTWARE_EXTENSION_VERIFICATION" | "WINDOWS_STORE" | "WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "WINDOWS_TCB_COMPONENT" | "WINDOWS_THIRD_PARTY_APPLICATION_COMPONENT" | "WINDOWS_UPDATE";
          } | {
            /**
             * @minLength 1
             * @maxLength 64
             * @pattern ^([0-2])\.([0-9]|([0-3][0-9]))(\.([0-9]+)){0,126}$
             */
            PolicyObjectIdentifier: string;
          })[];
        };
      };
    };
  } | {
    TemplateV3: {
      CertificateValidity: {
        ValidityPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
        RenewalPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
      };
      /**
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      SupersededTemplates?: string[];
      PrivateKeyAttributes: {
        /** @minimum 1 */
        MinimalKeyLength: number;
        KeySpec: "KEY_EXCHANGE" | "SIGNATURE";
        /**
         * @minItems 1
         * @maxItems 100
         * @uniqueItems true
         */
        CryptoProviders?: string[];
        KeyUsageProperty: {
          PropertyType: "ALL";
        } | {
          PropertyFlags: {
            Decrypt?: boolean;
            KeyAgreement?: boolean;
            Sign?: boolean;
          };
        };
        Algorithm: "RSA" | "ECDH_P256" | "ECDH_P384" | "ECDH_P521";
      };
      PrivateKeyFlags: {
        ExportableKey?: boolean;
        StrongKeyProtectionRequired?: boolean;
        RequireAlternateSignatureAlgorithm?: boolean;
        ClientVersion: "WINDOWS_SERVER_2008" | "WINDOWS_SERVER_2008_R2" | "WINDOWS_SERVER_2012" | "WINDOWS_SERVER_2012_R2" | "WINDOWS_SERVER_2016";
      };
      EnrollmentFlags: {
        IncludeSymmetricAlgorithms?: boolean;
        UserInteractionRequired?: boolean;
        RemoveInvalidCertificateFromPersonalStore?: boolean;
        NoSecurityExtension?: boolean;
        EnableKeyReuseOnNtTokenKeysetStorageFull?: boolean;
      };
      SubjectNameFlags: {
        SanRequireDomainDns?: boolean;
        SanRequireSpn?: boolean;
        SanRequireDirectoryGuid?: boolean;
        SanRequireUpn?: boolean;
        SanRequireEmail?: boolean;
        SanRequireDns?: boolean;
        RequireDnsAsCn?: boolean;
        RequireEmail?: boolean;
        RequireCommonName?: boolean;
        RequireDirectoryPath?: boolean;
      };
      GeneralFlags: {
        AutoEnrollment?: boolean;
        MachineType?: boolean;
      };
      HashAlgorithm: "SHA256" | "SHA384" | "SHA512";
      Extensions: {
        KeyUsage: {
          Critical?: boolean;
          UsageFlags: {
            DigitalSignature?: boolean;
            NonRepudiation?: boolean;
            KeyEncipherment?: boolean;
            DataEncipherment?: boolean;
            KeyAgreement?: boolean;
          };
        };
        ApplicationPolicies?: {
          Critical?: boolean;
          /**
           * @minItems 1
           * @maxItems 100
           * @uniqueItems true
           */
          Policies: ({
            PolicyType: "ALL_APPLICATION_POLICIES" | "ANY_PURPOSE" | "ATTESTATION_IDENTITY_KEY_CERTIFICATE" | "CERTIFICATE_REQUEST_AGENT" | "CLIENT_AUTHENTICATION" | "CODE_SIGNING" | "CTL_USAGE" | "DIGITAL_RIGHTS" | "DIRECTORY_SERVICE_EMAIL_REPLICATION" | "DISALLOWED_LIST" | "DNS_SERVER_TRUST" | "DOCUMENT_ENCRYPTION" | "DOCUMENT_SIGNING" | "DYNAMIC_CODE_GENERATOR" | "EARLY_LAUNCH_ANTIMALWARE_DRIVER" | "EMBEDDED_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "ENCLAVE" | "ENCRYPTING_FILE_SYSTEM" | "ENDORSEMENT_KEY_CERTIFICATE" | "FILE_RECOVERY" | "HAL_EXTENSION" | "IP_SECURITY_END_SYSTEM" | "IP_SECURITY_IKE_INTERMEDIATE" | "IP_SECURITY_TUNNEL_TERMINATION" | "IP_SECURITY_USER" | "ISOLATED_USER_MODE" | "KDC_AUTHENTICATION" | "KERNEL_MODE_CODE_SIGNING" | "KEY_PACK_LICENSES" | "KEY_RECOVERY" | "KEY_RECOVERY_AGENT" | "LICENSE_SERVER_VERIFICATION" | "LIFETIME_SIGNING" | "MICROSOFT_PUBLISHER" | "MICROSOFT_TIME_STAMPING" | "MICROSOFT_TRUST_LIST_SIGNING" | "OCSP_SIGNING" | "OEM_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "PLATFORM_CERTIFICATE" | "PREVIEW_BUILD_SIGNING" | "PRIVATE_KEY_ARCHIVAL" | "PROTECTED_PROCESS_LIGHT_VERIFICATION" | "PROTECTED_PROCESS_VERIFICATION" | "QUALIFIED_SUBORDINATION" | "REVOKED_LIST_SIGNER" | "ROOT_PROGRAM_AUTO_UPDATE_CA_REVOCATION" | "ROOT_PROGRAM_AUTO_UPDATE_END_REVOCATION" | "ROOT_PROGRAM_NO_OSCP_FAILOVER_TO_CRL" | "ROOT_LIST_SIGNER" | "SECURE_EMAIL" | "SERVER_AUTHENTICATION" | "SMART_CARD_LOGIN" | "SPC_ENCRYPTED_DIGEST_RETRY_COUNT" | "SPC_RELAXED_PE_MARKER_CHECK" | "TIME_STAMPING" | "WINDOWS_HARDWARE_DRIVER_ATTESTED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_EXTENDED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_VERIFICATION" | "WINDOWS_HELLO_RECOVERY_KEY_ENCRYPTION" | "WINDOWS_KITS_COMPONENT" | "WINDOWS_RT_VERIFICATION" | "WINDOWS_SOFTWARE_EXTENSION_VERIFICATION" | "WINDOWS_STORE" | "WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "WINDOWS_TCB_COMPONENT" | "WINDOWS_THIRD_PARTY_APPLICATION_COMPONENT" | "WINDOWS_UPDATE";
          } | {
            /**
             * @minLength 1
             * @maxLength 64
             * @pattern ^([0-2])\.([0-9]|([0-3][0-9]))(\.([0-9]+)){0,126}$
             */
            PolicyObjectIdentifier: string;
          })[];
        };
      };
    };
  } | {
    TemplateV4: {
      CertificateValidity: {
        ValidityPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
        RenewalPeriod: {
          PeriodType: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
          /**
           * @minimum 1
           * @maximum 8766000
           */
          Period: number;
        };
      };
      /**
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      SupersededTemplates?: string[];
      PrivateKeyAttributes: {
        /** @minimum 1 */
        MinimalKeyLength: number;
        KeySpec: "KEY_EXCHANGE" | "SIGNATURE";
        /**
         * @minItems 1
         * @maxItems 100
         * @uniqueItems true
         */
        CryptoProviders?: string[];
        KeyUsageProperty?: {
          PropertyType: "ALL";
        } | {
          PropertyFlags: {
            Decrypt?: boolean;
            KeyAgreement?: boolean;
            Sign?: boolean;
          };
        };
        Algorithm?: "RSA" | "ECDH_P256" | "ECDH_P384" | "ECDH_P521";
      };
      PrivateKeyFlags: {
        ExportableKey?: boolean;
        StrongKeyProtectionRequired?: boolean;
        RequireAlternateSignatureAlgorithm?: boolean;
        RequireSameKeyRenewal?: boolean;
        UseLegacyProvider?: boolean;
        ClientVersion: "WINDOWS_SERVER_2012" | "WINDOWS_SERVER_2012_R2" | "WINDOWS_SERVER_2016";
      };
      EnrollmentFlags: {
        IncludeSymmetricAlgorithms?: boolean;
        UserInteractionRequired?: boolean;
        RemoveInvalidCertificateFromPersonalStore?: boolean;
        NoSecurityExtension?: boolean;
        EnableKeyReuseOnNtTokenKeysetStorageFull?: boolean;
      };
      SubjectNameFlags: {
        SanRequireDomainDns?: boolean;
        SanRequireSpn?: boolean;
        SanRequireDirectoryGuid?: boolean;
        SanRequireUpn?: boolean;
        SanRequireEmail?: boolean;
        SanRequireDns?: boolean;
        RequireDnsAsCn?: boolean;
        RequireEmail?: boolean;
        RequireCommonName?: boolean;
        RequireDirectoryPath?: boolean;
      };
      GeneralFlags: {
        AutoEnrollment?: boolean;
        MachineType?: boolean;
      };
      HashAlgorithm?: "SHA256" | "SHA384" | "SHA512";
      Extensions: {
        KeyUsage: {
          Critical?: boolean;
          UsageFlags: {
            DigitalSignature?: boolean;
            NonRepudiation?: boolean;
            KeyEncipherment?: boolean;
            DataEncipherment?: boolean;
            KeyAgreement?: boolean;
          };
        };
        ApplicationPolicies?: {
          Critical?: boolean;
          /**
           * @minItems 1
           * @maxItems 100
           * @uniqueItems true
           */
          Policies: ({
            PolicyType: "ALL_APPLICATION_POLICIES" | "ANY_PURPOSE" | "ATTESTATION_IDENTITY_KEY_CERTIFICATE" | "CERTIFICATE_REQUEST_AGENT" | "CLIENT_AUTHENTICATION" | "CODE_SIGNING" | "CTL_USAGE" | "DIGITAL_RIGHTS" | "DIRECTORY_SERVICE_EMAIL_REPLICATION" | "DISALLOWED_LIST" | "DNS_SERVER_TRUST" | "DOCUMENT_ENCRYPTION" | "DOCUMENT_SIGNING" | "DYNAMIC_CODE_GENERATOR" | "EARLY_LAUNCH_ANTIMALWARE_DRIVER" | "EMBEDDED_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "ENCLAVE" | "ENCRYPTING_FILE_SYSTEM" | "ENDORSEMENT_KEY_CERTIFICATE" | "FILE_RECOVERY" | "HAL_EXTENSION" | "IP_SECURITY_END_SYSTEM" | "IP_SECURITY_IKE_INTERMEDIATE" | "IP_SECURITY_TUNNEL_TERMINATION" | "IP_SECURITY_USER" | "ISOLATED_USER_MODE" | "KDC_AUTHENTICATION" | "KERNEL_MODE_CODE_SIGNING" | "KEY_PACK_LICENSES" | "KEY_RECOVERY" | "KEY_RECOVERY_AGENT" | "LICENSE_SERVER_VERIFICATION" | "LIFETIME_SIGNING" | "MICROSOFT_PUBLISHER" | "MICROSOFT_TIME_STAMPING" | "MICROSOFT_TRUST_LIST_SIGNING" | "OCSP_SIGNING" | "OEM_WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "PLATFORM_CERTIFICATE" | "PREVIEW_BUILD_SIGNING" | "PRIVATE_KEY_ARCHIVAL" | "PROTECTED_PROCESS_LIGHT_VERIFICATION" | "PROTECTED_PROCESS_VERIFICATION" | "QUALIFIED_SUBORDINATION" | "REVOKED_LIST_SIGNER" | "ROOT_PROGRAM_AUTO_UPDATE_CA_REVOCATION" | "ROOT_PROGRAM_AUTO_UPDATE_END_REVOCATION" | "ROOT_PROGRAM_NO_OSCP_FAILOVER_TO_CRL" | "ROOT_LIST_SIGNER" | "SECURE_EMAIL" | "SERVER_AUTHENTICATION" | "SMART_CARD_LOGIN" | "SPC_ENCRYPTED_DIGEST_RETRY_COUNT" | "SPC_RELAXED_PE_MARKER_CHECK" | "TIME_STAMPING" | "WINDOWS_HARDWARE_DRIVER_ATTESTED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_EXTENDED_VERIFICATION" | "WINDOWS_HARDWARE_DRIVER_VERIFICATION" | "WINDOWS_HELLO_RECOVERY_KEY_ENCRYPTION" | "WINDOWS_KITS_COMPONENT" | "WINDOWS_RT_VERIFICATION" | "WINDOWS_SOFTWARE_EXTENSION_VERIFICATION" | "WINDOWS_STORE" | "WINDOWS_SYSTEM_COMPONENT_VERIFICATION" | "WINDOWS_TCB_COMPONENT" | "WINDOWS_THIRD_PARTY_APPLICATION_COMPONENT" | "WINDOWS_UPDATE";
          } | {
            /**
             * @minLength 1
             * @maxLength 64
             * @pattern ^([0-2])\.([0-9]|([0-3][0-9]))(\.([0-9]+)){0,126}$
             */
            PolicyObjectIdentifier: string;
          })[];
        };
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^(?!^\s+$)((?![\x5c'\x2b,;<=>#\x22])([\x20-\x7E]))+$
   */
  Name: string;
  ReenrollAllCertificateHolders?: boolean;
  Tags?: Record<string, string>;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/template\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  TemplateArn?: string;
};
