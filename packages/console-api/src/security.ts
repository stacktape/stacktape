import { z } from 'zod';
import type { GuardrailType } from './guardrails.js';

/**
 * The Console's security section, as seen from the CLI.
 *
 * After a deployment the CLI evaluates the stack's resolved configuration against the rule catalog below and
 * reports the findings for that project and stage. The Console keeps one finding per fingerprint, reopens it
 * when it comes back, and resolves it when a later report no longer contains it. Vulnerability findings from
 * dependency inventories arrive through a different path and share only the vocabularies defined here.
 */

export const SECURITY_FINDING_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type SecurityFindingSeverity = (typeof SECURITY_FINDING_SEVERITIES)[number];
export const securityFindingSeveritySchema = z.enum(SECURITY_FINDING_SEVERITIES);

export const SECURITY_FINDING_KINDS = ['POSTURE', 'SECRET', 'VULNERABILITY'] as const;
export type SecurityFindingKind = (typeof SECURITY_FINDING_KINDS)[number];
export const securityFindingKindSchema = z.enum(SECURITY_FINDING_KINDS);

export const SECURITY_FINDING_STATUSES = ['OPEN', 'RESOLVED', 'IGNORED'] as const;
export type SecurityFindingStatus = (typeof SECURITY_FINDING_STATUSES)[number];

/** Sorting and threshold order: a lower rank is more severe. */
export const SECURITY_SEVERITY_RANK: Record<SecurityFindingSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4
};

export const SECURITY_RULE_CATEGORIES = [
  'network-exposure',
  'data-protection',
  'identity-and-access',
  'secrets',
  'resilience'
] as const;
export type SecurityRuleCategory = (typeof SECURITY_RULE_CATEGORIES)[number];

export type SecurityRuleDefinition = {
  title: string;
  /** One or two sentences a developer without a security background can act on. */
  description: string;
  category: SecurityRuleCategory;
  kind: Exclude<SecurityFindingKind, 'VULNERABILITY'>;
  defaultSeverity: SecurityFindingSeverity;
  /** Rules that only matter once real users depend on the stack are reported for production stages only. */
  productionOnly?: boolean;
  /** The organization guardrail that blocks deployments violating this rule, when one exists. */
  guardrailType?: GuardrailType;
};

/**
 * Bumped when a rule is added, removed, or changes what it reports. Each report records the version it was
 * produced with, so a stack last scanned by an older CLI is visibly behind the catalog.
 */
export const SECURITY_RULE_CATALOG_VERSION = 1;

export const SECURITY_RULES = {
  'database-reachable-from-internet': {
    title: 'Database reachable from the internet',
    description:
      'The database accepts connections from any internet address. Anyone who learns the endpoint can attempt to log in. Put it in the VPC so only your workloads can reach it.',
    category: 'network-exposure',
    kind: 'POSTURE',
    defaultSeverity: 'HIGH',
    guardrailType: 'require-vpc-databases'
  },
  'database-deletion-protection-disabled': {
    title: 'Production database without deletion protection',
    description:
      'A production database can be deleted by a single command or a mistaken stack change. Deletion protection makes removal a deliberate two-step action.',
    category: 'data-protection',
    kind: 'POSTURE',
    defaultSeverity: 'MEDIUM',
    productionOnly: true,
    guardrailType: 'require-deletion-protection'
  },
  'database-backups-disabled': {
    title: 'Production data store without backups',
    description:
      'Data in this store cannot be recovered after corruption, a bad migration or an accidental delete. Enable automated backups or point-in-time recovery.',
    category: 'data-protection',
    kind: 'POSTURE',
    defaultSeverity: 'MEDIUM',
    productionOnly: true,
    guardrailType: 'require-data-backups'
  },
  'load-balancer-without-firewall': {
    title: 'Public load balancer without a web application firewall',
    description:
      'Requests reach the application without any filtering of common attack patterns, bad bots or floods. Attach a web-app-firewall resource with useFirewall.',
    category: 'network-exposure',
    kind: 'POSTURE',
    defaultSeverity: 'MEDIUM',
    guardrailType: 'require-waf'
  },
  'bucket-publicly-accessible': {
    title: 'Bucket readable or writable by anyone',
    description:
      'Every object in the bucket can be read, or even written, by anyone on the internet. Use private accessibility unless the bucket intentionally serves public files.',
    category: 'network-exposure',
    kind: 'POSTURE',
    defaultSeverity: 'MEDIUM'
  },
  'iam-statement-allows-any-action': {
    title: 'IAM statement allows every action',
    description:
      'A role statement grants every AWS action, so a bug or a compromised dependency in that workload can do anything in the account. Grant the specific actions the code uses.',
    category: 'identity-and-access',
    kind: 'POSTURE',
    defaultSeverity: 'HIGH'
  },
  'iam-statement-wildcard-service-on-any-resource': {
    title: 'IAM statement grants a whole service on every resource',
    description:
      'A role statement allows all actions of an AWS service on every resource in the account, for example s3:* on *. Narrow it to the actions and resources the workload needs.',
    category: 'identity-and-access',
    kind: 'POSTURE',
    defaultSeverity: 'MEDIUM'
  },
  'stack-termination-protection-disabled': {
    title: 'Production stack without termination protection',
    description:
      'The whole production stack can be deleted in one step. Termination protection requires disabling it and redeploying before deletion succeeds.',
    category: 'data-protection',
    kind: 'POSTURE',
    defaultSeverity: 'LOW',
    productionOnly: true,
    guardrailType: 'require-stack-termination-protection'
  },
  'container-single-instance-in-production': {
    title: 'Production container service runs a single instance',
    description:
      'One failing instance takes the service down and every deployment causes a short outage. Run at least two instances for production services.',
    category: 'resilience',
    kind: 'POSTURE',
    defaultSeverity: 'LOW',
    productionOnly: true,
    guardrailType: 'require-multiple-container-instances'
  },
  'queue-without-dead-letter-queue': {
    title: 'Queue without a dead-letter queue',
    description:
      'Messages that keep failing are dropped silently after their retention period. A dead-letter queue keeps them for inspection and replay.',
    category: 'resilience',
    kind: 'POSTURE',
    defaultSeverity: 'LOW',
    guardrailType: 'require-dead-letter-queue'
  },
  'secret-in-environment-variable': {
    title: 'Secret stored as a plain environment variable',
    description:
      'A value that looks like a credential is written directly into the configuration, so it lives in Git history and in every deployment. Move it to $Secret() and rotate the credential, because a committed secret stays valid until it is revoked.',
    category: 'secrets',
    kind: 'SECRET',
    defaultSeverity: 'CRITICAL'
  }
} as const satisfies Record<string, SecurityRuleDefinition>;

export type SecurityRuleId = keyof typeof SECURITY_RULES;
export const SECURITY_RULE_IDS = Object.keys(SECURITY_RULES) as SecurityRuleId[];

/** The catalog entry for a rule id, or undefined for an id this version does not know (including `constructor`). */
export const getSecurityRule = (ruleId: string): SecurityRuleDefinition | undefined =>
  Object.hasOwn(SECURITY_RULES, ruleId)
    ? (SECURITY_RULES as Record<string, SecurityRuleDefinition>)[ruleId]
    : undefined;

const boundedText = (max: number) => z.string().trim().min(1).max(max);

/**
 * One finding as the CLI reports it. Findings describe themselves (title, message, remediation) so a Console
 * that does not know a rule yet, or knows an older wording, still shows what the CLI found.
 */
export const securityReportFindingSchema = z.object({
  kind: z.enum(['POSTURE', 'SECRET']),
  /** Catalog rule id. Not restricted to the ids above: a newer CLI may report a rule an older Console lacks. */
  ruleId: boundedText(100),
  /** Stable identity of the finding within a project and stage, so it can be reopened and resolved. */
  fingerprint: boundedText(300),
  severity: securityFindingSeveritySchema,
  title: boundedText(200),
  message: boundedText(2000),
  remediation: boundedText(2000).optional(),
  resourceName: boundedText(200).optional(),
  resourceType: boundedText(100).optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const SECURITY_EXPOSURE_KINDS = ['public-endpoint', 'database', 'bucket'] as const;
export type SecurityExposureKind = (typeof SECURITY_EXPOSURE_KINDS)[number];

/** What the internet can reach in this stack, for the exposure view. Facts, not findings. */
export const securityExposureEntrySchema = z.object({
  kind: z.enum(SECURITY_EXPOSURE_KINDS),
  resourceName: boundedText(200),
  resourceType: boundedText(100),
  /** How the resource can be reached, for example `internet`, `vpc`, `whitelisted-ips-only` or `private`. */
  accessibility: boundedText(60),
  protectedByFirewall: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const recordSecurityReportInputSchema = z.object({
  /** The deployment this report belongs to. The Console takes project, stage and region from that operation. */
  invocationId: boundedText(200),
  catalogVersion: z.number().int().positive(),
  stacktapeVersion: boundedText(60).optional(),
  /** Kinds the CLI evaluated. Open findings of these kinds that are absent from the report are resolved. */
  coveredKinds: z
    .array(z.enum(['POSTURE', 'SECRET']))
    .min(1)
    .max(2),
  findings: z.array(securityReportFindingSchema).max(1000),
  exposure: z.array(securityExposureEntrySchema).max(1000).default([])
});

export type RecordSecurityReportParams = z.input<typeof recordSecurityReportInputSchema>;
export type SecurityReportFinding = z.infer<typeof securityReportFindingSchema>;
export type SecurityExposureEntry = z.infer<typeof securityExposureEntrySchema>;

export type RecordSecurityReportResponse = {
  accepted: boolean;
  /** Present when the report was not applied. */
  reason?: 'operation-not-found' | 'operation-not-a-deployment' | 'disabled-by-organization' | 'stack-deleted';
  opened: number;
  reopened: number;
  resolved: number;
  unchanged: number;
};

export const countSecurityFindingsBySeverity = (
  findings: ReadonlyArray<{ severity: SecurityFindingSeverity }>
): Record<SecurityFindingSeverity, number> => {
  const counts: Record<SecurityFindingSeverity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
};
