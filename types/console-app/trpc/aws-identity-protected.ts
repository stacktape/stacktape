// GENERATED FILE - DO NOT EDIT
// Source: console-app/scripts/generate-stacktape-console-types.ts

export type ValidateCertificateParams = {
  certificateArn: string;
  version: number;
};

export type UpsertDefaultDomainDnsRecordParams = {
  domainName: string;
  region: string;
  stackName: string;
  targetInfo: {
    hostedZoneId: string;
    domainName: string;
  };
  version: number;
};

export type DeleteDefaultDomainDnsRecordParams = {
  domainName: string;
  region: string;
  stackName: string;
  targetInfo: {
    hostedZoneId: string;
    domainName: string;
  };
  version: number;
};

export type AwsIdentityTrpcClient = {
  validateCertificate: {
    mutate: (args: ValidateCertificateParams) => Promise<void>;
  };
  upsertDefaultDomainDnsRecord: {
    mutate: (args: UpsertDefaultDomainDnsRecordParams) => Promise<void>;
  };
  deleteDefaultDomainDnsRecord: {
    mutate: (args: DeleteDefaultDomainDnsRecordParams) => Promise<void>;
  };
};
