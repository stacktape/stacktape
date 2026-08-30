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
  // The config-side trigger type of the alarm ("lambda-error-rate", "synthetic-test-failure", ...).
  // Optional: alarms deployed before this field existed report without it and classify generically.
  triggerType: z.string().optional(),
  channels: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      type: z.enum(['slack', 'ms_teams', 'e_mail', 'discord', 'webhook', 'console-channel']),
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

export const reportUptimeResultsInputSchema = z.object({
  proberRegion: z.string().min(1),
  results: z
    .array(
      z.object({
        project: z.string().min(1),
        stage: z.string().min(1),
        checkName: z.string().min(1),
        /** Content-hash revision of the check definition; the server drops results from stale revisions. */
        revision: z.string().min(1),
        /** Minute-truncated ISO timestamp of the EventBridge tick that scheduled this probe. */
        scheduledTick: z.string().datetime(),
        /** 0 for the on-the-minute probe, 1 for the +30s probe of 30-second checks. */
        probeOrdinal: z.number().int().min(0).max(1),
        status: z.enum(['up', 'down']),
        httpStatus: z.number().int().optional(),
        latencyMs: z.number().min(0).optional(),
        timings: z
          .object({
            dnsMs: z.number().min(0).optional(),
            connectMs: z.number().min(0).optional(),
            tlsMs: z.number().min(0).optional(),
            ttfbMs: z.number().min(0).optional()
          })
          .optional(),
        failureReason: z.string().max(500).optional(),
        certExpiresAt: z.string().optional()
      })
    )
    .max(500)
});

export type ValidateCertificateParams = z.input<typeof validateCertificateInputSchema>;
export type UpsertDefaultDomainDnsRecordParams = z.input<typeof defaultDomainDnsRecordInputSchema>;
export type DeleteDefaultDomainDnsRecordParams = z.input<typeof defaultDomainDnsRecordInputSchema>;
export type ReportAlarmEventParams = z.input<typeof reportAlarmEventInputSchema>;
export type ReportIssueEventParams = z.input<typeof reportIssueEventInputSchema>;
export type ReportUptimeResultsParams = z.input<typeof reportUptimeResultsInputSchema>;

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
  reportUptimeResults: {
    mutate: (args: ReportUptimeResultsParams) => Promise<void>;
  };
};
