import { z } from 'zod';

/**
 * The Console API's AWS-identity surface: procedures a deployed Stacktape stack calls on behalf of the AWS
 * account it runs in.
 *
 * Callers prove who they are with a presigned STS `GetCallerIdentity` request rather than a Stacktape
 * credential, and the server accepts them only from an AWS account that is connected to an organization.
 */

export const validateCertificateInputSchema = z.object({
  certificateArn: z.string(),
  version: z.number()
});

export const defaultDomainDnsRecordInputSchema = z.object({
  domainName: z.string(),
  stackName: z.string(),
  region: z.string(),
  targetInfo: z.object({ hostedZoneId: z.string(), domainName: z.string() }),
  version: z.number()
});

export const reportAlarmEventInputSchema = z.object({
  sourceEventId: z.string().min(1).optional(),
  type: z.enum(['ALARM_TRIGGERED', 'ALARM_RESOLVED']),
  alarmName: z.string(),
  project: z.string(),
  stage: z.string(),
  region: z.string(),
  title: z.string(),
  sourceConfigName: z.string().optional(),
  channels: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      type: z.enum(['slack', 'ms_teams', 'e_mail', 'discord', 'webhook']),
      properties: z.unknown()
    })
  ),
  details: z.record(z.string(), z.unknown()).optional()
});

export const reportIssueEventInputSchema = z.object({
  fingerprint: z.string(),
  errorMessage: z.string(),
  errorType: z.string(),
  stackTrace: z.array(
    z.object({
      function: z.string(),
      file: z.string(),
      line: z.number(),
      column: z.number()
    })
  ),
  functionName: z.string().optional(),
  logGroup: z.string().optional(),
  requestId: z.string().optional(),
  project: z.string(),
  stage: z.string(),
  region: z.string(),
  rawLog: z.string().optional(),
  occurrenceWeight: z.number().int().min(1).max(100).optional()
});

export type ValidateCertificateParams = z.input<typeof validateCertificateInputSchema>;
export type UpsertDefaultDomainDnsRecordParams = z.input<typeof defaultDomainDnsRecordInputSchema>;
export type DeleteDefaultDomainDnsRecordParams = z.input<typeof defaultDomainDnsRecordInputSchema>;
export type ReportAlarmEventParams = z.input<typeof reportAlarmEventInputSchema>;
export type ReportIssueEventParams = z.input<typeof reportIssueEventInputSchema>;

/**
 * The id of the issue the report was recorded against, or null when the reporting organization has issue
 * monitoring switched off for that project or stage. Clients report and move on either way.
 */
export type ReportIssueEventResponse = string | null;

/** The procedures a verified AWS identity may call, and nothing else. */
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
  reportIssueEvent: {
    mutate: (args: ReportIssueEventParams) => Promise<ReportIssueEventResponse>;
  };
};
