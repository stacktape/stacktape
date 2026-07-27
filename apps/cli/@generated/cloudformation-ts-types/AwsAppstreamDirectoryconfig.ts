// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-directoryconfig.json

/** Resource Type definition for AWS::AppStream::DirectoryConfig */
export type AwsAppstreamDirectoryconfig = {
  /** @uniqueItems false */
  OrganizationalUnitDistinguishedNames: string[];
  ServiceAccountCredentials: {
    AccountName: string;
    AccountPassword: string;
  };
  DirectoryName: string;
  CertificateBasedAuthProperties?: {
    Status?: string;
    CertificateAuthorityArn?: string;
  };
};
