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

export type ReportAlarmEventParams = {
  type: 'ALARM_TRIGGERED' | 'ALARM_RESOLVED';
  alarmName: string;
  sourceConfigName?: string;
  project: string;
  stage: string;
  region: string;
  title: string;
  channels: Array<{
    id?: string;
    name: string;
    type: 'slack' | 'ms_teams' | 'e_mail' | 'discord' | 'webhook';
    properties: unknown;
  }>;
  details?: Record<string, unknown>;
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
  reportAlarmEvent: {
    mutate: (args: ReportAlarmEventParams) => Promise<string>;
  };
};
