// This file is auto-generated. Do not edit manually.
// Source: aws-certificatemanager-account.json

/** Resource schema for AWS::CertificateManager::Account. */
export type AwsCertificatemanagerAccount = {
  ExpiryEventsConfiguration: {
    /**
     * @minimum 1
     * @maximum 45
     */
    DaysBeforeExpiry?: number;
  };
  AccountId?: string;
};
